import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountRoleSwitcher } from "./AccountRoleSwitcher";

describe("account role switcher",()=>{
  it("shows a teacher workspace only to a verified dual-role account",()=>{
    const dual=renderToStaticMarkup(createElement(AccountRoleSwitcher,{account:{id:"u",plan:"free",role:"parent",roles:["parent","teacher"]},onSwitched(){}}));
    const parent=renderToStaticMarkup(createElement(AccountRoleSwitcher,{account:{id:"u",plan:"free",role:"parent",roles:["parent"]},onSwitched(){}}));
    expect(dual).toContain("Buka ruang guru");expect(parent).toBe("");
  });
});
