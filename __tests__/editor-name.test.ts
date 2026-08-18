import { validateDraftName } from "@/lib/editor-name";
test("draft name validation", () => { expect(validateDraftName(" ")).toBeDefined(); expect(validateDraftName("bad/name")).toBeDefined(); expect(validateDraftName("原稿.txt")).toBeUndefined(); });
