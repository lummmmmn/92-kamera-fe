import { G, MUT, TXT, BR2, DELIVERY_AREAS_DEFAULT } from "../../lib/constants.js";
import { fmtVND } from "../../utils/format.js";
import BookingSummaryCard from "./BookingSummaryCard.jsx";
import BookingDiscount from "./BookingDiscount.jsx";

const BK_flatInp = {
  background: "rgba(255,255,255,0.55)",
  border: "1px solid rgba(255,255,255,0.70)",
  borderRadius: 16,
  outline: "none",
  color: TXT,
  fontSize: 15,
  fontFamily: "system-ui,sans-serif",
  width: "100%",
  padding: "12px 14px",
  boxSizing: "border-box",
  WebkitAppearance: "none",
  transition: "border-color .2s, box-shadow .2s",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

function BK_IconBox({ children }) {
  return <span style={{ fontSize: 14, opacity: 0.45, lineHeight: 1 }}>{children}</span>;
}

function BK_FormRow({ icon, labelTop, labelBottom, children, noBorder }) {
  return (
    <div style={{ paddingBottom: noBorder ? 0 : 18, borderBottom: noBorder ? "none" : "1px solid rgba(0,0,0,0.08)", marginBottom: noBorder ? 0 : 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {icon && <BK_IconBox>{icon}</BK_IconBox>}
        <span style={{ color: "#888", fontSize: 10, letterSpacing: 1.5, fontFamily: "system-ui,sans-serif", fontWeight: 700 }}>{labelTop}</span>
        {labelBottom && <span style={{ color: "#555", fontSize: 10, fontFamily: "system-ui,sans-serif", marginLeft: 4 }}>{labelBottom}</span>}
      </div>
      {children}
    </div>
  );
}

export default function BookingStep3({
  selectedCamList,
  selCams,
  selAcc,
  accessories,
  days,
  selSession,
  pickDate,
  hasQuickSelect,
  appliedDiscounts,
  appliedRental,
  appliedDelivery,
  discountExpanded,
  setDiscountExpanded,
  discountCode,
  setDiscountCode,
  discountLoading,
  discountMsg,
  setDiscountMsg,
  applyDiscount,
  removeDiscount,
  subtotal,
  rentalDiscountAmt,
  deliveryDiscountAmt,
  appliedTotal,
  totalDiscountAmt,
  deliveryFeeCalc,
  deliveryFee2Way,
  total,
  info,
  setInfo,
  deliveryStreet,
  setDeliveryStreet,
  deliveryWard,
  setDeliveryWard,
  deliveryDistrict,
  setDeliveryDistrict,
  deliveryPickup,
  setDeliveryPickup,
  deliveryReturn,
  setDeliveryReturn,
  selfPickup,
  setSelfPickup,
  deliveryFees,
  submitting,
  submitError,
  handleFinish,
  setStep,
}) {
  return (
    <div style={{ paddingBottom: 160 }}>
      <button
        onClick={() => setStep(2)}
        className="bk-back"
        style={{
          background: "none",
          border: "none",
          color: MUT,
          cursor: "pointer",
          fontSize: 12,
          fontFamily: "system-ui,sans-serif",
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span style={{ position: "relative", zIndex: 1 }}>← Quay lại bước 2 (thời gian)</span>
      </button>

      {/* Hint khi đến từ QuickSearch */}
      {hasQuickSelect && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            background: "rgba(41,121,207,0.18)",
            border: "1.5px solid rgba(41,121,207,0.50)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 1px 0 rgba(255,255,255,0.60) inset, 0 2px 10px rgba(41,121,207,0.12)",
          }}
        >
          <span style={{ fontSize: 15, flexShrink: 0 }}>📅</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#0d2a50", fontSize: 11, fontFamily: "system-ui,sans-serif", fontWeight: 800, marginBottom: 3, letterSpacing: 0.3 }}>
              Đã chọn từ Kiểm tra máy theo ngày
            </div>
            <div style={{ color: "#1a3a60", fontSize: 10.5, fontFamily: "system-ui,sans-serif", lineHeight: 1.6 }}>
              Ngày: <strong>{pickDate}</strong> · {days} ngày · Có thể{" "}
              <button
                onClick={() => setStep(1)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#b5830a",
                  cursor: "pointer",
                  fontSize: 10.5,
                  padding: 0,
                  textDecoration: "underline",
                  fontFamily: "system-ui,sans-serif",
                  fontWeight: 700,
                }}
              >
                đổi máy
              </button>{" "}
              hoặc{" "}
              <button
                onClick={() => setStep(2)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#b5830a",
                  cursor: "pointer",
                  fontSize: 10.5,
                  padding: 0,
                  textDecoration: "underline",
                  fontFamily: "system-ui,sans-serif",
                  fontWeight: 700,
                }}
              >
                đổi ngày/phụ kiện
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUMMARY CARD */}
      <BookingSummaryCard
        selectedCamList={selectedCamList}
        selCams={selCams}
        selAcc={selAcc}
        accessories={accessories}
        days={days}
        selSession={selSession}
        pickDate={pickDate}
      />

      <div style={{ color: G, fontSize: 10, letterSpacing: 2, fontFamily: "system-ui,sans-serif", fontWeight: 700, marginBottom: 14 }}>
        THÔNG TIN NGƯỜI THUÊ
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.42)",
          border: "1px solid rgba(255,255,255,0.62)",
          borderRadius: 22,
          padding: "20px 18px",
          marginBottom: 14,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {/* VOUCHER HANDLE */}
        <BookingDiscount
          appliedDiscounts={appliedDiscounts}
          appliedRental={appliedRental}
          appliedDelivery={appliedDelivery}
          appliedTotal={appliedTotal}
          discountExpanded={discountExpanded}
          setDiscountExpanded={setDiscountExpanded}
          discountCode={discountCode}
          setDiscountCode={setDiscountCode}
          discountLoading={discountLoading}
          discountMsg={discountMsg}
          setDiscountMsg={setDiscountMsg}
          applyDiscount={applyDiscount}
          removeDiscount={removeDiscount}
          deliveryFeeCalc={deliveryFeeCalc}
          subtotal={subtotal}
          rentalDiscountAmt={rentalDiscountAmt}
          deliveryDiscountAmt={deliveryDiscountAmt}
          totalDiscountAmt={totalDiscountAmt}
          BK_flatInp={BK_flatInp}
        />

        {/* Họ tên */}
        <BK_FormRow icon="👤" labelTop="HỌ VÀ TÊN *">
          <input
            className="bk-inp"
            style={BK_flatInp}
            type="text"
            value={info.name}
            onChange={(e) => setInfo((p) => ({ ...p, name: e.target.value }))}
            placeholder="Nhập họ và tên"
          />
        </BK_FormRow>

        {/* SĐT */}
        <BK_FormRow icon="📞" labelTop="SỐ ĐIỆN THOẠI *">
          <input
            className="bk-inp"
            style={BK_flatInp}
            type="tel"
            value={info.phone}
            onChange={(e) => setInfo((p) => ({ ...p, phone: e.target.value }))}
            placeholder="0901 234 567"
          />
        </BK_FormRow>

        {/* Zalo */}
        <BK_FormRow icon="💬" labelTop="ZALO" labelBottom="(XÁC NHẬN ĐƠN)">
          <input
            className="bk-inp"
            style={BK_flatInp}
            type="tel"
            value={info.zalo}
            onChange={(e) => setInfo((p) => ({ ...p, zalo: e.target.value }))}
            placeholder="Số Zalo"
          />
        </BK_FormRow>

        {/* Địa chỉ chi tiết */}
        {!selfPickup && (
          <BK_FormRow icon="📍" labelTop="ĐỊA CHỈ CHI TIẾT" labelBottom="SỐ NHÀ / ĐƯỜNG / THÔN">
            <input
              className="bk-inp"
              style={BK_flatInp}
              type="text"
              value={deliveryStreet}
              onChange={(e) => setDeliveryStreet(e.target.value)}
              placeholder="Ví dụ: 12 Nguyễn Huệ, Thôn Phú Bình..."
            />
          </BK_FormRow>
        )}

        {/* Xã / Phường */}
        {!selfPickup && (
          <BK_FormRow icon="🏘️" labelTop="XÃ / PHƯỜNG" labelBottom="CHỌN KHU VỰC">
            <select
              className="bk-inp"
              style={{ ...BK_flatInp, color: deliveryWard ? TXT : "#6a8aaa" }}
              value={deliveryWard}
              onChange={(e) => setDeliveryWard(e.target.value)}
            >
              <option value="">-- Chọn xã / phường --</option>
              {(deliveryFees || DELIVERY_AREAS_DEFAULT).map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </BK_FormRow>
        )}

        {/* Huyện / TP */}
        {!selfPickup && (
          <BK_FormRow icon="🏙️" labelTop="HUYỆN / THÀNH PHỐ" labelBottom="">
            <select
              className="bk-inp"
              style={{ ...BK_flatInp, color: TXT }}
              value={deliveryDistrict}
              onChange={(e) => setDeliveryDistrict(e.target.value)}
            >
              <option value="Núi Thành">Núi Thành</option>
              <option value="Tam Kỳ">Tam Kỳ</option>
            </select>
          </BK_FormRow>
        )}

        {/* Loại giao nhận */}
        <BK_FormRow icon="🚗" labelTop="GIAO NHẬN" labelBottom="THIẾT BỊ" noBorder={!deliveryWard && !selfPickup}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
            {/* NHẬN MÁY */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif", fontWeight: 700, letterSpacing: "0.06em", paddingLeft: 2, marginBottom: 2 }}>
                📦 NHẬN MÁY
              </div>
              {[
                { val: "shop", label: "Tại shop", fee: 0 },
                { val: "home", label: "Giao tận nơi", fee: deliveryFee2Way > 0 ? Math.round(deliveryFee2Way / 2) : 0 },
              ].map((opt) => {
                const active = !selfPickup && deliveryPickup === opt.val;
                return (
                  <div key={opt.val}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: "pointer",
                        padding: "7px 10px",
                        borderRadius: 10,
                        background: active ? "rgba(201,168,76,0.13)" : "transparent",
                        border: `1px solid ${active ? "rgba(201,168,76,0.45)" : "rgba(0,0,0,0.06)"}`,
                        transition: "all .15s",
                      }}
                    >
                      <input
                        type="radio"
                        name="deliveryPickup"
                        value={opt.val}
                        checked={active}
                        onChange={() => {
                          setSelfPickup(false);
                          setDeliveryPickup(opt.val);
                        }}
                        style={{ accentColor: G, width: 15, height: 15, flexShrink: 0 }}
                      />
                      <span style={{ color: TXT, fontSize: 13, fontFamily: "system-ui,sans-serif", flex: 1 }}>{opt.label}</span>
                      {!selfPickup && deliveryWard && (
                        <span style={{ color: active ? G : MUT, fontSize: 12, fontFamily: "system-ui,sans-serif", fontWeight: active ? 700 : 400, whiteSpace: "nowrap" }}>
                          {opt.val === "shop" ? "0 đ" : opt.fee === 0 ? "Miễn phí" : fmtVND(opt.fee)}
                        </span>
                      )}
                    </label>
                    {active && opt.val === "shop" && (
                      <div style={{ marginLeft: 35, marginTop: 3, color: MUT, fontSize: 11, fontFamily: "system-ui,sans-serif" }}>
                        📍 Thôn Thạnh Mỹ, Xã Tam Mỹ, Thành Phố Đà Nẵng
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* TRẢ MÁY */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif", fontWeight: 700, letterSpacing: "0.06em", paddingLeft: 2, marginBottom: 2 }}>
                🔄 TRẢ MÁY
              </div>
              {[
                { val: "shop", label: "Tại shop", fee: 0 },
                { val: "home", label: "Nhận tận nơi", fee: deliveryFee2Way > 0 ? Math.round(deliveryFee2Way / 2) : 0 },
              ].map((opt) => {
                const active = !selfPickup && deliveryReturn === opt.val;
                return (
                  <div key={opt.val}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: "pointer",
                        padding: "7px 10px",
                        borderRadius: 10,
                        background: active ? "rgba(201,168,76,0.13)" : "transparent",
                        border: `1px solid ${active ? "rgba(201,168,76,0.45)" : "rgba(0,0,0,0.06)"}`,
                        transition: "all .15s",
                      }}
                    >
                      <input
                        type="radio"
                        name="deliveryReturn"
                        value={opt.val}
                        checked={active}
                        onChange={() => {
                          setSelfPickup(false);
                          setDeliveryReturn(opt.val);
                        }}
                        style={{ accentColor: G, width: 15, height: 15, flexShrink: 0 }}
                      />
                      <span style={{ color: TXT, fontSize: 13, fontFamily: "system-ui,sans-serif", flex: 1 }}>{opt.label}</span>
                      {!selfPickup && deliveryWard && (
                        <span style={{ color: active ? G : MUT, fontSize: 12, fontFamily: "system-ui,sans-serif", fontWeight: active ? 700 : 400, whiteSpace: "nowrap" }}>
                          {opt.val === "shop" ? "0 đ" : opt.fee === 0 ? "Miễn phí" : fmtVND(opt.fee)}
                        </span>
                      )}
                    </label>
                    {active && opt.val === "shop" && (
                      <div style={{ marginLeft: 35, marginTop: 3, color: MUT, fontSize: 11, fontFamily: "system-ui,sans-serif" }}>
                        📍 Thôn Thạnh Mỹ, Xã Tam Mỹ, Thành Phố Đà Nẵng
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!selfPickup && deliveryWard && deliveryFeeCalc > 0 && (
              <div
                style={{
                  marginTop: 4,
                  padding: "8px 12px",
                  background: "rgba(201,168,76,0.10)",
                  border: "1px solid rgba(201,168,76,0.30)",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ color: MUT, fontSize: 11, fontFamily: "system-ui,sans-serif" }}>Phí giao nhận</span>
                <span style={{ color: G, fontSize: 13, fontWeight: 700, fontFamily: "system-ui,sans-serif" }}>{fmtVND(deliveryFeeCalc)}</span>
              </div>
            )}
            {!selfPickup && deliveryWard && deliveryFeeCalc === 0 && deliveryPickup === "shop" && deliveryReturn === "shop" && (
              <div style={{ marginTop: 4, padding: "8px 12px", background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.30)", borderRadius: 10 }}>
                <span style={{ color: "#22c55e", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>✓ Tự đến shop — miễn phí giao nhận</span>
              </div>
            )}
            {!selfPickup && deliveryWard && deliveryFeeCalc === 0 && !(deliveryPickup === "shop" && deliveryReturn === "shop") && (
              <div style={{ marginTop: 4, padding: "8px 12px", background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.30)", borderRadius: 10 }}>
                <span style={{ color: "#22c55e", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>✓ Miễn phí giao nhận khu vực này</span>
              </div>
            )}
          </div>
        </BK_FormRow>

        {/* Ghi chú */}
        <BK_FormRow icon="📋" labelTop="GHI CHÚ" noBorder>
          <textarea
            className="bk-inp"
            style={{ ...BK_flatInp, resize: "vertical", minHeight: 80, lineHeight: 1.6 }}
            value={info.note}
            onChange={(e) => setInfo((p) => ({ ...p, note: e.target.value }))}
            placeholder="Yêu cầu đặc biệt, lưu ý thêm..."
          />
        </BK_FormRow>
      </div>

      {/* BOTTOM CHEKOUT BAR (Fixed) */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(660px,100vw)",
          background: "linear-gradient(to top, rgba(197,216,236,0.97) 80%, transparent)",
          padding: "14px 18px 18px",
          zIndex: 999,
          boxSizing: "border-box",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {submitError && (
          <div
            style={{
              marginBottom: 8,
              padding: "9px 14px",
              background: "#FEF0F0",
              border: "1px solid #B0282844",
              borderRadius: 9,
              color: "#ef4444",
              fontSize: 12,
              fontFamily: "system-ui,sans-serif",
              lineHeight: 1.5,
            }}
          >
            {submitError}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, padding: "0 2px" }}>
          <div>
            <span style={{ color: "#666", fontSize: 10, letterSpacing: 1.5, fontFamily: "system-ui,sans-serif", fontWeight: 600 }}>
              TỔNG CỘNG
            </span>
          </div>
          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 2 }}>
            {rentalDiscountAmt > 0 && (
              <span style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif" }}>
                📷 {new Intl.NumberFormat("vi-VN").format(subtotal)}đ thuê
              </span>
            )}
            {rentalDiscountAmt > 0 && (
              <span style={{ color: "#22c55e", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>
                🎞️ -{new Intl.NumberFormat("vi-VN").format(rentalDiscountAmt)}đ giảm thuê
              </span>
            )}
            {deliveryFeeCalc > 0 && (
              <span style={{ color: MUT, fontSize: 10, fontFamily: "system-ui,sans-serif" }}>
                🚚 +{new Intl.NumberFormat("vi-VN").format(deliveryFeeCalc)}đ giao nhận
              </span>
            )}
            {deliveryDiscountAmt > 0 && (
              <span style={{ color: "#60a5fa", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>
                🚗 -{new Intl.NumberFormat("vi-VN").format(deliveryDiscountAmt)}đ giảm ship
              </span>
            )}
            {totalDiscountAmt > 0 && (
              <span style={{ color: "#f59e0b", fontSize: 11, fontFamily: "system-ui,sans-serif" }}>
                💰 -{new Intl.NumberFormat("vi-VN").format(totalDiscountAmt)}đ giảm tổng đơn
              </span>
            )}
            <span
              style={{
                color: G,
                fontWeight: 900,
                fontSize: 20,
                fontFamily: "system-ui,sans-serif",
                borderTop: rentalDiscountAmt > 0 || deliveryFeeCalc > 0 || totalDiscountAmt > 0 ? "1px solid rgba(0,0,0,0.10)" : "none",
                paddingTop: rentalDiscountAmt > 0 || deliveryFeeCalc > 0 || totalDiscountAmt > 0 ? 4 : 0,
                marginTop: rentalDiscountAmt > 0 || deliveryFeeCalc > 0 || totalDiscountAmt > 0 ? 2 : 0,
              }}
            >
              {new Intl.NumberFormat("vi-VN").format(total)} đ
            </span>
          </div>
        </div>

        <button
          className="bk-cta"
          onClick={() => !submitting && info.name && info.phone && handleFinish()}
          disabled={!info.name || !info.phone || submitting}
          style={{
            width: "100%",
            padding: "15px 24px",
            background: info.name && info.phone && !submitting ? `linear-gradient(135deg, #6a6a82 0%, #c8c8dc 50%, #4a4a60 100%)` : BR2,
            color: info.name && info.phone && !submitting ? "#0a0a18" : "#444",
            border: "none",
            borderRadius: 20,
            cursor: info.name && info.phone && !submitting ? "pointer" : "not-allowed",
            fontWeight: 900,
            fontSize: 15,
            fontFamily: "system-ui,sans-serif",
            letterSpacing: 1,
            boxShadow: info.name && info.phone && !submitting ? `0 4px 24px rgba(200,200,240,0.35)` : "none",
            boxSizing: "border-box",
            opacity: submitting ? 0.75 : 1,
            transition: "opacity .2s",
          }}
        >
          {submitting ? "⏳ Đang xử lý..." : "Xác nhận đặt thuê"}
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginTop: 8, flexWrap: "wrap" }}>
          {["🛡️ Thiết bị chính hãng", "🔍 Kiểm tra kỹ trước khi giao", "🎧 Hỗ trợ 24/7"].map((t, i, arr) => (
            <span key={t} style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <span style={{ color: MUT, fontSize: 9, fontFamily: "system-ui,sans-serif" }}>{t}</span>
              {i < arr.length - 1 && <span style={{ color: "#222", margin: "0 8px", fontSize: 11 }}>|</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
