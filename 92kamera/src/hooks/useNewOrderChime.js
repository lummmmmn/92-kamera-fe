import { useEffect, useRef } from "react";

// Chuông báo đơn mới — hễ phát hiện có thêm đơn mới (unseenCount tăng) thì
// kêu "ting ting ting" lặp lại trong khoảng 30 giây rồi tự tắt, không kêu
// dai dẳng. Dùng Web Audio API để tự tạo âm thanh (không cần file mp3,
// không thêm dependency nào).

const RING_TOTAL_MS = 30000; // tổng thời gian kêu mỗi lần có đơn mới
const CHIME_EVERY_MS = 4000; // khoảng cách giữa các lần "ting ting ting"
const BEEP_GAP_MS = 160; // khoảng cách giữa 3 tiếng "ting" trong 1 lần
const BEEP_DURATION_S = 0.12;
const BEEP_FREQ_HZ = 1046.5; // âm C6 — tiếng "ting" trong, dễ chú ý

export function useNewOrderChime(unseenCount) {
  const ctxRef = useRef(null);
  const intervalRef = useRef(null);
  const stopTimeoutRef = useRef(null);
  const prevCountRef = useRef(unseenCount);

  const getCtx = () => {
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctxRef.current = new AudioCtx();
    }
    return ctxRef.current;
  };

  // Trình duyệt chặn phát âm thanh tự động khi chưa có thao tác của người
  // dùng — nên "mở khoá" AudioContext ngay lần đầu admin bấm/gõ bất cứ đâu
  // trên trang, để chuông sẵn sàng phát khi có đơn mới sau đó.
  useEffect(() => {
    const unlock = () => {
      const ctx = getCtx();
      if (ctx && ctx.state === "suspended") ctx.resume();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const stopRinging = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
  };

  const playChime = () => {
    const ctx = getCtx();
    if (!ctx) return;
    const playOneBeep = (delaySec) => {
      const startAt = ctx.currentTime + delaySec;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = BEEP_FREQ_HZ;
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.28, startAt + 0.01);
      gain.gain.linearRampToValueAtTime(0, startAt + BEEP_DURATION_S);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + BEEP_DURATION_S + 0.02);
    };
    // "ting ting ting" — 3 tiếng liên tiếp mỗi lần chuông kêu
    playOneBeep(0);
    playOneBeep(BEEP_GAP_MS / 1000);
    playOneBeep((BEEP_GAP_MS * 2) / 1000);
  };

  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = unseenCount;

    // Chỉ bắt đầu kêu khi số đơn chưa xem TĂNG (có đơn mới vừa vào)
    if (unseenCount > prev) {
      stopRinging(); // reset nếu đang kêu dở, cho đủ 30s mới từ đầu
      playChime();
      intervalRef.current = setInterval(playChime, CHIME_EVERY_MS);
      stopTimeoutRef.current = setTimeout(stopRinging, RING_TOTAL_MS);
    }
  }, [unseenCount]);

  useEffect(() => stopRinging, []);
}
