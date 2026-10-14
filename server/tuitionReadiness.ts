import type {Pool} from "pg";
import {accessError} from "./familyAccess.js";
import {loadToyyibSandboxConfiguration} from "./toyyibPay.js";
import {configuredTuitionEmail} from "./tuitionEmailAdapter.js";
import {configuredTuitionWhatsApp} from "./tuitionWhatsAppAdapter.js";
export async function tuitionAdminReadiness(pool:Pick<Pool,"query">,actor:string,env:NodeJS.ProcessEnv=process.env){
 if(!(await pool.query("SELECT 1 FROM user_roles WHERE user_id=$1 AND role='super_admin' AND status='active'",[actor])).rows[0])throw accessError("SUPER_ADMIN_ACCESS_REQUIRED");
 const [counts,video,retention]=await Promise.all([
  pool.query("SELECT (SELECT count(*)::int FROM tuition_packages WHERE status='published') AS packages,(SELECT count(*)::int FROM teacher_kyc_reviews) AS reviews"),
  pool.query("SELECT enabled,provider FROM tuition_video_policy WHERE singleton=true"),
  pool.query("SELECT tutor_days,support_days,kyc_days,approved_at IS NOT NULL AS approved FROM tuition_retention_policy WHERE singleton=true"),
 ]);
 let gatewayConfigured=false;try{await loadToyyibSandboxConfiguration(env);gatewayConfigured=true;}catch{/* Expose only configuration state, never file paths, credentials or raw provider errors. */}
 const inspectEnv={...env,TUITION_NOTIFICATION_WORKER_ENABLED:"true"},emailConfigured=!!configuredTuitionEmail(inspectEnv),whatsappConfigured=!!configuredTuitionWhatsApp(inspectEnv);
 const policy=retention.rows[0],videoPolicy=video.rows[0];
 return{mode:"sandbox",fullAcceptanceVerified:false,moneyTransferEnabled:false,
  payments:{configured:gatewayConfigured,checkoutEnabled:gatewayConfigured&&env.TOYYIBPAY_CHECKOUT_ENABLED==="true",publishedPackageCount:counts.rows[0]?.packages??0,realSandboxAcceptanceVerified:false},
  video:{configured:!!videoPolicy?.provider,enabled:!!videoPolicy?.enabled,provider:videoPolicy?.provider??null,actualClassVerified:false},
  notifications:{emailConfigured,whatsappConfigured,workerEnabled:env.TUITION_NOTIFICATION_WORKER_ENABLED==="true"&&(emailConfigured||whatsappConfigured),actualDeliveryVerified:false},
  governance:{kycReviewRecordCount:counts.rows[0]?.reviews??0,realIdentityAcceptanceVerified:false,retentionPeriodsRecorded:!!policy?.approved&&[policy.tutor_days,policy.support_days,policy.kyc_days].every(value=>value!==null),deletionEnabled:false},
  notice:"Kod dan tetapan berasingan daripada pengesahan sebenar. Akaun, harga, bukti identiti dan polisi perlu disemak sebelum operasi komersial. Ujian dalaman tanpa caj boleh menggunakan data sintetik."};
}
