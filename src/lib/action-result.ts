export interface ActionResult<T = undefined> {
  ok: boolean;
  message?: string;
  data?: T;
}
