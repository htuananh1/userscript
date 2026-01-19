export const MSG = {
  PREFIX: "§7[§bFasterGhast§7]§r",
  info(text) {
    return `${this.PREFIX} §f${text}`;
  },
  warn(text) {
    return `${this.PREFIX} §e${text}`;
  },
  error(text) {
    return `${this.PREFIX} §c${text}`;
  },
  NO_PERMISSION: "Bạn không có quyền dùng lệnh này. Hãy gắn tag §bfh_admin§r để quản trị.",
  HELP: "Lệnh: !pregen corridor <dài> <rộng> <bước> [tối_đa_mỗi_tick] | !pregen stop | !pregen status",
  PREGEN_ALREADY_RUNNING: "Đã có tiến trình pregen đang chạy. Dùng !pregen status hoặc !pregen stop.",
  PREGEN_STOPPED: "Đã dừng tiến trình pregen.",
  PREGEN_NONE: "Không có tiến trình pregen nào đang chạy.",
  PREGEN_PAUSED: "Pregen tạm dừng vì tick quá nặng. Sẽ tự tiếp tục khi ổn định.",
  PREGEN_RESUMED: "Pregen đã tiếp tục khi server ổn định.",
  PREGEN_DONE: "Hoàn tất pregen hành lang bay.",
  PREGEN_STATUS: (percent, index, total) =>
    `Tiến độ pregen: ${percent}% (${index}/${total} điểm).`,
  PREGEN_START: (length, width, step, maxPerTick) =>
    `Bắt đầu pregen hành lang: dài ${length}b, rộng ${width}b, bước ${step}b, tối đa ${maxPerTick} vị trí/tick.`
};
