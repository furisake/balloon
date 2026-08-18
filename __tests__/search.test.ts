import { searchText } from "@/lib/search";
test("text search returns every partial match and snippets", () => {
  const result = searchText("青空と青空", "青空");
  expect(result.map((item) => item.from)).toEqual([0, 3]);
  expect(result[0].snippet).toContain("青空");
});
