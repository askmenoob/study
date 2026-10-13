"""Isolated HTTP/PostgreSQL regressions for guided tutoring.

Run: npm run build:api && python3 scripts/test-tutor-integration.py
Requires the existing local imai-study Docker image, network and PostgreSQL.
Creates only a unique temporary database/container, disables cloud AI, and
always removes its resources. Never queries production student data.
"""
import collections
import json
import os
import pathlib
import re
import secrets
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid

REPO = pathlib.Path(__file__).resolve().parents[1]
POSTGRES = "imai-study-postgres-1"
DB_USER = "imai_study"
suffix = secrets.token_hex(5)
db = "imai_tutor_qa_" + suffix
name = "imai-tutor-qa-" + suffix
checks = 0
requests_by_parent = collections.Counter()
token_parent = {}
expected_logs = []
env_path = None
database_created = False
container_started = False


def run(args, **kwargs):
    return subprocess.run(args, check=True, capture_output=True, text=True, **kwargs)


def sql(query):
    return run(
        ["docker", "exec", "-i", POSTGRES, "psql", "-U", DB_USER,
         "-d", db, "-At", "-v", "ON_ERROR_STOP=1"],
        input=query,
    ).stdout.strip()


def literal(value):
    return "'" + str(value).replace("'", "''") + "'"


def check(ok, label, detail=None):
    global checks
    if not ok:
        raise AssertionError(label + (": " + str(detail) if detail is not None else ""))
    checks += 1
    print("PASS " + label, flush=True)


with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
base = "http://127.0.0.1:" + str(port) + "/api"


def request(method, path, token=None, body=None):
    if token in token_parent:
        owner = token_parent[token]
        requests_by_parent[owner] += 1
        if requests_by_parent[owner] > 30:
            raise AssertionError("Test fixture exceeded 30 requests for parent " + str(owner))
    headers = {"Content-Type": "application/json"} if body is not None else {}
    if token:
        headers["Authorization"] = "Bearer " + token
    raw = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=raw, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status, json.loads(response.read() or "{}")
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read() or "{}")


def healthy():
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        try:
            status, data = request("GET", "/health")
            if status == 200:
                return data
        except (OSError, urllib.error.URLError):
            pass
        time.sleep(0.1)
    raise RuntimeError("Isolated QA API did not become healthy")


def student(token, label, level="d4"):
    status, data = request("POST", "/students", token, {"name": label, "levelId": level})
    check(status == 201, "create synthetic student " + label, data)
    return data["student"]["id"]


def tutor(token, sid, message, conversation=None, expected=200, label=None, **context):
    body = {"studentId": sid, "levelId": "d4", "subjectId": "math", "message": message}
    if conversation is not None:
        body["conversationId"] = conversation
    body.update(context)
    body = {key: value for key, value in body.items() if value is not None}
    status, data = request("POST", "/tutor", token, body)
    check(status == expected, label or ("tutor accepts " + repr(message)), data)
    if status == 200:
        check(
            isinstance(data.get("answer"), str) and bool(data["answer"].strip())
            and isinstance(data.get("provider"), str)
            and isinstance(data.get("sources"), list)
            and data.get("support") in ("study-notes", "general"),
            "tutor response preserves answer/provider/sources/support contract",
            data,
        )
        expected_logs.append({
            "student_id": sid, "subject_id": body.get("subjectId"),
            "topic_id": body.get("topicId"), "question": message,
            "answer": data["answer"], "provider": data["provider"],
            "conversation_id": body.get("conversationId"), "resource_id": body.get("resourceId"),
        })
    return data


def no_stale_math(reply, label):
    check(
        reply.get("provider") == "local"
        and not re.search(r"\b(?:Betul|Belum tepat|17)\b", reply["answer"]),
        label, reply,
    )


def focus(token, sid):
    status, link = request("POST", f"/students/{sid}/study-links", token, {"durationMinutes": 30})
    check(status == 201, "create isolated focus link", link)
    status, data = request("POST", "/auth/redeem-study-link", body={"code": link["code"]})
    check(status == 200, "redeem isolated focus link", data)
    token_parent[data["token"]] = token_parent[token]
    return data["token"], data["session"]["id"], link["link"]["id"]


legacy_user, legacy_student, legacy_log = (str(uuid.uuid4()) for _ in range(3))
legacy_schema = f"""
CREATE TABLE users (
 id uuid PRIMARY KEY, email text UNIQUE NOT NULL, password_hash text NOT NULL,
 display_name text NOT NULL, plan text NOT NULL DEFAULT 'free',
 subscription_status text NOT NULL DEFAULT 'active',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE students (
 id uuid PRIMARY KEY, parent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name text NOT NULL, level_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tutor_logs (
 id uuid PRIMARY KEY, student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
 subject_id text, topic_id text, question text NOT NULL, answer text NOT NULL,
 provider text NOT NULL DEFAULT 'local', created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO users(id,email,password_hash,display_name)
 VALUES('{legacy_user}','legacy-{suffix}@example.invalid','not-a-login-hash','QA Legacy');
INSERT INTO students(id,parent_id,name,level_id)
 VALUES('{legacy_student}','{legacy_user}','QA Legacy Student','d4');
INSERT INTO tutor_logs(id,student_id,subject_id,question,answer,provider)
 VALUES('{legacy_log}','{legacy_student}','math','Legacy question','Legacy answer','local');
"""
try:
    # Inspect only connection configuration and image identity, never production rows.
    info = json.loads(run(["docker", "inspect", "imai-study-api-1"]).stdout)[0]
    production_env = dict(item.split("=", 1) for item in info["Config"]["Env"] if "=" in item)
    database_url = production_env["DATABASE_URL"].rsplit("/", 1)[0] + "/" + db
    del production_env
    run(["docker", "exec", POSTGRES, "createdb", "-U", DB_USER, db])
    database_created = True
    sql(legacy_schema)
    legacy_before = json.loads(sql(
        "SELECT row_to_json(t) FROM tutor_logs t WHERE id=" + literal(legacy_log)
    ))
    check("conversation_id" not in legacy_before and "resource_id" not in legacy_before,
          "fixture starts with pre-migration tutor schema")

    with tempfile.NamedTemporaryFile("w", prefix="imai-tutor-qa-", delete=False) as env_file:
        env_path = env_file.name
        os.chmod(env_path, 0o600)
        env_file.write(
            "DATABASE_URL=" + database_url + "\nJWT_SECRET=" + secrets.token_urlsafe(48)
            + "\nPORT=4181\nFRONTEND_ORIGIN=http://127.0.0.1\nFREE_AI_ONLY=true\n"
            + "GEMINI_API_KEY=\nGEMINI_API_KEY_FILE=\nGOOGLE_API_KEY=\n"
        )
    try:
        run([
            "docker", "run", "-d", "--name", name, "--network", "imai-study_study",
            "--env-file", env_path, "-p", f"127.0.0.1:{port}:4181",
            "-v", str(REPO / "server/dist") + ":/app/server/dist:ro", info["Image"],
        ])
        container_started = True
    finally:
        os.unlink(env_path)
        env_path = None
    del database_url, info
    health = healthy()
    check(health.get("status") == "ok", "GET health still reports healthy API")
    check(health.get("ai", {}).get("configured") is False, "isolated API has no configured AI key")
    migrated = json.loads(sql("SELECT row_to_json(t) FROM tutor_logs t WHERE id=" + literal(legacy_log)))
    check({key: migrated[key] for key in legacy_before} == legacy_before
          and migrated.get("conversation_id") is None and migrated.get("resource_id") is None,
          "metadata migration preserves all original tutor row values and adds nullable columns")
    columns = json.loads(sql("""
SELECT json_object_agg(column_name, data_type) FROM information_schema.columns
WHERE table_schema='public' AND table_name='tutor_logs'
AND column_name IN ('conversation_id','resource_id');
"""))
    check(columns == {"conversation_id": "uuid", "resource_id": "text"},
          "metadata migration adds UUID conversation and text resource columns")
    check(sql("SELECT count(*) FROM pg_indexes WHERE schemaname='public' "
              "AND tablename='tutor_logs' AND indexname='tutor_logs_conversation_idx'") == "1",
          "conversation lookup index exists")

    parents = []
    for index in range(3):
        status, data = request("POST", "/auth/register", body={
            "email": f"tutor-{suffix}-{index}@example.invalid",
            "password": secrets.token_urlsafe(24), "displayName": "QA Parent",
        })
        check(status == 201, "register synthetic parent " + str(index), data)
        parents.append(data["token"])
        token_parent[data["token"]] = index
    a = student(parents[0], "QA Arithmetic")
    sibling = student(parents[0], "QA Sibling")
    note_student = student(parents[1], "QA Notes")
    child_student = student(parents[2], "QA Focus")
    child_sibling = student(parents[2], "QA Focus Sibling")

    conversation = str(uuid.uuid4())
    first = tutor(parents[0], a, "2 + 3", conversation)
    check(first["provider"] == "verified-math-teach" and not re.search(r"\b5\b", first["answer"]),
          "first response teaches without revealing arithmetic answer", first)
    wrong = tutor(parents[0], a, "4", conversation,
                  label="one-character wrong answer is accepted")
    check(wrong["provider"] == "verified-math-teach"
          and "Belum tepat" in wrong["answer"] and not re.search(r"\b5\b", wrong["answer"]),
          "wrong attempt retains exercise and withholds final answer", wrong)
    hint = tutor(parents[0], a, "Saya perlukan petunjuk", conversation)
    check(hint["provider"] == "verified-math-teach" and not re.search(r"\b5\b", hint["answer"]),
          "first hint retains exercise without revealing final answer", hint)
    correct = tutor(parents[0], a, "5", conversation,
                    label="one-character correct answer is accepted")
    check(correct["provider"] == "verified-math" and "Betul" in correct["answer"],
          "later correct answer is verified against original exercise", correct)

    scope = str(uuid.uuid4())
    tutor(parents[0], a, "8 + 9", scope)
    no_stale_math(tutor(parents[0], a, "17", str(uuid.uuid4())),
                  "new conversation cannot resume another conversation's exercise")
    no_stale_math(tutor(parents[0], sibling, "17", scope),
                  "sibling cannot inherit exercise through shared conversation ID")
    no_stale_math(tutor(parents[0], a, "17", scope, subjectId="science"),
                  "different subject cannot inherit a math exercise")
    no_stale_math(tutor(parents[0], a, "17", scope, subjectId=None),
                  "omitted subject is isolated from explicit math history")
    no_stale_math(tutor(parents[0], a, "17", scope, topicId="different-topic"),
                  "different topic cannot inherit an exercise")
    resumed = tutor(parents[0], a, "17", scope)
    check(resumed["provider"] == "verified-math" and "Betul" in resumed["answer"],
          "original conversation still verifies its own answer after other scopes")

    resource_scope = str(uuid.uuid4())
    tutor(parents[0], a, "8 + 9", resource_scope, resourceId="library-d4-math-pecahan-bahagian-sama-note")
    no_stale_math(tutor(parents[0], a, "17", resource_scope),
                  "resource-free conversation cannot inherit selected-note exercise")

    notes = {note["id"]: note for note in json.loads((REPO / "server/studyNotes.json").read_text())}
    selected_id = "library-d4-math-pecahan-bahagian-sama-note"
    note_conversation = str(uuid.uuid4())
    selected = tutor(parents[1], note_student, "Kenapa penyebut mesti sama?", note_conversation,
                     resourceId=selected_id, levelId="t6")
    check(selected["provider"] == "local" and selected["support"] == "study-notes",
          "stored primary level overrides forged STPM level for source eligibility", selected)
    original = notes[selected_id]
    check(selected["sources"] == [{
        "id": original["id"], "title": original["title"],
        "excerpt": "\n\n".join(original["body"])[:1800],
    }], "selected note returns original source title and text")
    check("bukan jawapan daripada AI" in selected.get("notice", "")
          and "belum tersedia" in selected["answer"],
          "AI-unavailable response honestly identifies local guidance", selected)
    local = tutor(parents[1], note_student, "Zyxqv", str(uuid.uuid4()), levelId="t6")
    check(local["provider"] == "local" and local["support"] == "general"
          and local["sources"] == [] and "sekolah rendah" in local["answer"]
          and "STPM" not in local["answer"],
          "stored primary level also controls general local guidance", local)
    for resource, subject, label in [
        ("library-t1-math-persamaan-seimbang-note", "math", "wrong-level resource rejects 400 despite forged client level"),
        ("library-d4-science-cahaya-dan-bayang-note", "math", "wrong-subject resource rejects 400"),
        ("qa-nonexistent-resource", "math", "nonexistent resource rejects 400"),
    ]:
        tutor(parents[1], note_student, "Terangkan nota ini", str(uuid.uuid4()),
              expected=400, label=label, resourceId=resource, subjectId=subject, levelId="t3")
    tutor(parents[1], note_student, "5", "not-a-uuid", expected=400,
          label="malformed conversation ID rejects 400")

    tutor(None, child_student, "2 + 3", str(uuid.uuid4()), expected=401,
          label="anonymous tutor request rejects 401")
    tutor(parents[0], note_student, "2 + 3", str(uuid.uuid4()), expected=404,
          label="parent cannot tutor another family's student")
    child, focus_id, link_id = focus(parents[2], child_student)
    active = tutor(child, child_student, "2 + 3", str(uuid.uuid4()))
    check(active["provider"] == "verified-math-teach", "active focused child can use tutor")
    tutor(child, child_sibling, "2 + 3", str(uuid.uuid4()), expected=403,
          label="focused child cannot tutor sibling")
    tutor(child, a, "2 + 3", str(uuid.uuid4()), expected=403,
          label="focused child cannot tutor another family's student")
    sql("UPDATE focus_sessions SET ends_at=now()-interval '1 second' WHERE id=" + literal(focus_id))
    tutor(child, child_student, "5", str(uuid.uuid4()), expected=401,
          label="expired focus session cannot use tutor")
    revoked, _, revoked_link = focus(parents[2], child_student)
    status, data = request("DELETE", f"/students/{child_student}/study-links/{revoked_link}", parents[2])
    check(status == 204, "parent revokes isolated focused session", data)
    tutor(revoked, child_student, "5", str(uuid.uuid4()), expected=401,
          label="revoked focus session cannot use tutor")

    saved = json.loads(sql("""
SELECT coalesce(json_agg(row_to_json(t)), '[]') FROM (
 SELECT student_id,subject_id,topic_id,question,answer,provider,conversation_id,resource_id
 FROM tutor_logs WHERE id != """ + literal(legacy_log) + ") t;"))
    normalize = lambda rows: sorted(json.dumps(row, sort_keys=True, ensure_ascii=False) for row in rows)
    check(normalize(saved) == normalize(expected_logs),
          "every successful reply persists exact conversation/resource/context and denied requests create no logs")
    check(any(row["conversation_id"] == note_conversation and row["resource_id"] == selected_id
              for row in saved), "selected note conversation and resource values persist together")
    check(all(count <= 30 for count in requests_by_parent.values()),
          "all authenticated request totals stay within 30 per parent")

    run(["docker", "restart", name])
    health = healthy()
    check(health.get("status") == "ok" and health.get("ai", {}).get("configured") is False,
          "GET health remains healthy after additive migration reruns")
    after_restart = json.loads(sql("SELECT row_to_json(t) FROM tutor_logs t WHERE id=" + literal(legacy_log)))
    check(after_restart == migrated, "repeated migration preserves legacy row and added metadata")
    check(sql("SELECT count(*) FROM tutor_logs") == str(len(expected_logs) + 1),
          "restart preserves every accepted tutor log")
    print("TOTAL", checks, "ASSERTIONS PASSED;", len(expected_logs), "SUCCESSFUL TUTOR REQUESTS;",
          "AUTHENTICATED REQUESTS PER PARENT", dict(requests_by_parent), flush=True)
finally:
    if env_path and pathlib.Path(env_path).exists():
        os.unlink(env_path)
    # Names are generated by this invocation; cleanup never targets production.
    cleanup_errors = []
    removed = subprocess.run(["docker", "rm", "-f", name], capture_output=True, text=True)
    if container_started and removed.returncode != 0:
        cleanup_errors.append("unique API container could not be removed")
    if database_created:
        dropped = subprocess.run(
            ["docker", "exec", POSTGRES, "dropdb", "-U", DB_USER, "--if-exists", db],
            capture_output=True, text=True,
        )
        if dropped.returncode != 0:
            cleanup_errors.append("unique QA database could not be removed")
    if cleanup_errors:
        raise RuntimeError("; ".join(cleanup_errors))
    print("QA DATABASE, CONTAINER AND PROTECTED ENV FILE CLEANED", flush=True)
