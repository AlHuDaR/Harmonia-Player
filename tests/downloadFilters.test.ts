import { describe,it,expect } from "vitest";
import { filterDownloads } from "../utils/downloadFilters";
import type { Download } from "../types/media";
const rows:Download[] = (["queued","downloading","retrying","complete","failed","cancelled"] as const)
  .map((status,i)=>({status,progress:0,track:{id:String(i),title:i===3?"موسيقى":"Track "+i,artist:"Artist",provider:i===3?"Instagram":"YouTube",kind:"video",...(status==="complete"?{localUri:"file:///saved.mp4"}:{})}}));
describe("download search and status",()=>{
  it("combines source/title search with real offline and active states",()=>{
    expect(filterDownloads(rows,"", "active").map(d=>d.status)).toEqual(["queued","downloading","retrying"]);
    expect(filterDownloads(rows," INSTAGRAM ","offline").map(d=>d.track.id)).toEqual(["3"]);
    expect(filterDownloads(rows,"موسيقى","all")).toHaveLength(1);
    expect(filterDownloads(rows,"Artist","attention").map(d=>d.status)).toEqual(["failed","cancelled"]);
    expect(filterDownloads(rows,"missing","all")).toEqual([]);
    expect(rows).toHaveLength(6);
  });
  it("never labels a completed record without a local URI as available offline",()=>{
    expect(filterDownloads([{...rows[3],track:{...rows[3].track,localUri:undefined}}],"","offline")).toEqual([]);
  });
});
