export const LIMITS = {
  contentBytes: 256 * 1024,
  maxPages: 12,
  maxImagesPerGallery: 30,
  maxImageBytes: 4 * 1024 * 1024,
  /**
   * 每张请柬允许登记的媒体文件上限（大于内容图数上限，给替换图片留余量）。
   * 配额随「保存内容时回收已移除图片的登记」释放，见 lib/media-gc.ts。
   */
  maxMediaAssetsPerInvitation: 40,
  guestNameMax: 20,
  blessingMax: 200,
  rsvpNoteMax: 100,
  manageCodeLength: 6,
  slugLength: 8,
} as const;

export const RATE_LIMITS = {
  /** 管理码连续错误 N 次后锁定（按 slug + IP 计） */
  codeMaxFailedAttempts: 5,
  /** 管理码锁定时长（分钟） */
  codeLockMinutes: 15,
  /** 单 IP 每小时最多验证管理码的次数（防对多个 slug 并行爆破；宽松取值以免误伤共享出口 IP 的用户） */
  codeVerifyPerHourPerIp: 60,
  /** 每 IP 每小时最多创建请柬数 */
  createPerHourPerIp: 5,
  /** 每 slug+IP 每分钟最多上报浏览次数 */
  viewPerMinute: 10,
  /** 每 slug+IP 每小时最多提交回执/祝福 */
  guestSubmitPerHour: 20,
} as const;

/** 代理头中的 IP 会原样入库，需限长防脏数据 */
export const MAX_CLIENT_IP_LENGTH = 64;

export const MANAGE_COOKIE_PREFIX = "mng_";
export const MANAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
