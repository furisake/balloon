const FORBIDDEN = /[\\/:*?"<>|\u0000-\u001f]/;
export function validateDraftName(value: string): string | undefined {
  if (!value.trim()) return "原稿名を入力してください";
  if (FORBIDDEN.test(value)) return "ファイル名に使用できない文字が含まれています";
  return undefined;
}
