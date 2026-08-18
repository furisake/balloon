import { lint } from "@/lib/core/linter";

describe("lint", () => {
  test.each([
    ["末尾 ", "行末に不要な空白"],
    ["...", "三点リーダー"],
    ["―", "ダッシュ"],
    ["［＃閉じない", "注記が閉じられていません"],
    ["😀", "Shift_JISへ変換できない文字"],
  ])("checks %s", (source, message) =>
    expect(lint(source).some((item) => item.message.includes(message))).toBe(
      true,
    ),
  );
  test("accepts conventional ellipsis and dash", () =>
    expect(
      lint("……と――").filter((item) => item.severity === "info"),
    ).toHaveLength(0));
});
