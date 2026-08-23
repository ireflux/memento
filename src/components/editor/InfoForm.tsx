"use client";

import type { InvitationContent } from "@/lib/validation/schemas";
import { isoToLocalInput, localInputToIso } from "./media";
import { MUSIC_LIBRARY } from "@/lib/music-library";

const inputCls =
  "w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-900";
const labelCls = "mb-1 block text-xs font-medium text-neutral-500";

export function InfoForm({
  content,
  onChange,
}: {
  content: InvitationContent;
  onChange: (patch: Partial<InvitationContent["info"]>) => void;
}) {
  const info = content.info;
  const isWedding = "groomName" in info;

  return (
    <div className="space-y-4">
      {isWedding ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>新郎姓名</label>
              <input
                className={inputCls}
                value={info.groomName}
                maxLength={20}
                onChange={(e) => onChange({ groomName: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>新娘姓名</label>
              <input
                className={inputCls}
                value={info.brideName}
                maxLength={20}
                onChange={(e) => onChange({ brideName: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>爱情故事（选填）</label>
            <textarea
              className={`${inputCls} min-h-24 leading-relaxed`}
              value={info.story ?? ""}
              maxLength={600}
              placeholder="从相遇那天讲起…"
              onChange={(e) => onChange({ story: e.target.value })}
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className={labelCls}>寿星昵称</label>
            <input
              className={inputCls}
              value={info.celebrantName}
              maxLength={20}
              onChange={(e) => onChange({ celebrantName: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>想对宾客说的话（选填）</label>
            <textarea
              className={`${inputCls} min-h-24 leading-relaxed`}
              value={info.wish ?? ""}
              maxLength={600}
              onChange={(e) => onChange({ wish: e.target.value })}
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{isWedding ? "婚礼时间" : "派对时间"}</label>
          <input
            type="datetime-local"
            className={inputCls}
            value={isoToLocalInput(info.eventTime)}
            onChange={(e) => {
              const iso = localInputToIso(e.target.value);
              if (iso) onChange({ eventTime: iso });
            }}
          />
        </div>
          <div>
            <label className={labelCls}>背景音乐</label>
            <select
              className={inputCls}
              value={info.musicId ?? ""}
              onChange={(e) =>
                onChange({ musicId: e.target.value || undefined })
              }
            >
              <option value="">不使用音乐</option>
              {MUSIC_LIBRARY.map((t) => (
                <option key={t.id} value={t.id} disabled={!t.url}>
                  {t.title}
                  {t.url ? "" : "（待上架）"}
                </option>
              ))}
            </select>
          </div>
      </div>

      <div>
        <label className={labelCls}>地点名称</label>
        <input
          className={inputCls}
          value={info.venueName}
          maxLength={50}
          placeholder={isWedding ? "如：XX酒店·宴会厅" : "如：XX 咖啡馆"}
          onChange={(e) => onChange({ venueName: e.target.value })}
        />
      </div>
      <div>
        <label className={labelCls}>详细地址</label>
        <input
          className={inputCls}
          value={info.venueAddress}
          maxLength={100}
          placeholder="省市区 + 街道门牌"
          onChange={(e) => onChange({ venueAddress: e.target.value })}
        />
      </div>
      <details className="text-xs text-neutral-400">
        <summary className="cursor-pointer select-none">
          高级：地图坐标（选填，提升导航精度）
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <input
            className={inputCls}
            inputMode="decimal"
            placeholder="纬度 lat"
            value={info.lat ?? ""}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onChange({ lat: Number.isFinite(v) ? v : undefined });
            }}
          />
          <input
            className={inputCls}
            inputMode="decimal"
            placeholder="经度 lng"
            value={info.lng ?? ""}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onChange({ lng: Number.isFinite(v) ? v : undefined });
            }}
          />
        </div>
      </details>
    </div>
  );
}
