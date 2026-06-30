import Logo from "../common/Logo.jsx";
import BookingStep1 from "./BookingStep1.jsx";
import BookingStep2 from "./BookingStep2.jsx";
import BookingStep3 from "./BookingStep3.jsx";
import BookingDone from "./BookingDone.jsx";
import { useBooking } from "../../hooks/useBooking.js";
import { G, MUT, TXT } from "../../lib/constants.js";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 300,
  background:
    "radial-gradient(ellipse 130% 85% at 50% 22%, #5fccdd 0%, transparent 70%), radial-gradient(ellipse 55% 40% at 15% 55%, rgba(77,193,213,0.7) 0%, transparent 60%), linear-gradient(180deg, #8fc8d4 0%, #a9b8bc 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 16px",
  overflowY: "auto",
};

const boxStyle = {
  background: "linear-gradient(160deg, rgba(232,240,248,0.88) 0%, rgba(197,216,236,0.80) 60%, rgba(181,206,230,0.76) 100%)",
  border: "1px solid rgba(255,255,255,0.60)",
  borderRadius: 20,
  padding: "min(20px, 3vw)",
  width: "min(660px,96vw)",
  position: "relative",
  margin: "auto",
  transition: "width .3s",
  backdropFilter: "blur(28px) saturate(160%) brightness(1.04)",
  WebkitBackdropFilter: "blur(28px) saturate(160%) brightness(1.04)",
  boxShadow:
    "0 1px 0 rgba(255,255,255,0.80) inset, 0 -1px 0 rgba(0,0,0,0.06) inset, 0 12px 48px rgba(0,0,0,0.30), 0 2px 16px rgba(0,0,0,0.16)",
};

const inpSStyle = {
  padding: "11px 14px",
  background: "rgba(255,255,255,0.55)",
  border: "1px solid rgba(255,255,255,0.70)",
  borderRadius: 12,
  color: TXT,
  fontSize: 13,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "system-ui,sans-serif",
  transition: "border .2s",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
};

const qtyBtnHelper = (onClick, label) => (
  <button
    onClick={onClick}
    style={{
      width: 26,
      height: 26,
      border: "1px solid rgba(255,255,255,0.65)",
      borderRadius: 5,
      background: "rgba(255,255,255,0.50)",
      color: TXT,
      cursor: "pointer",
      fontSize: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      fontFamily: "monospace",
    }}
  >
    {label}
  </button>
);

export default function BookingModal(props) {
  const b = useBooking(props);

  const stepLabel = ["Chọn thiết bị", "Thời gian & phụ kiện", "Thông tin đặt"];

  return (
    <div
      style={overlayStyle}
      className={props.isMobile ? "bk-modal-mobile" : ""}
      onClick={(e) => e.target === e.currentTarget && !b.done && props.onClose()}
    >
      <div style={{ position: "fixed", inset: 0, background: "linear-gradient(to right, rgba(236,243,248,0.58) 0%, transparent 40%, rgba(220,235,244,0.27) 100%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", inset: 0, background: "linear-gradient(to top, rgba(186,206,220,0.30) 0%, transparent 50%)", pointerEvents: "none" }} />
      <svg style={{ position: "fixed", inset: 0, width: "100%", height: "100%", opacity: 0.16, pointerEvents: "none" }} xmlns="http://www.w3.org/2000/svg">
        <filter id="grain-book">
          <feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="5" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-book)" />
      </svg>

      <div style={boxStyle}>
        <button onClick={props.onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: MUT, fontSize: 18, cursor: "pointer", lineHeight: 1 }}>
          ✕
        </button>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "flex-start", width: "100%", marginBottom: 4 }}>
            <Logo size={0.72} />
          </div>
          {!b.done && (
            <div style={{ display: "flex", alignItems: "flex-start", marginTop: 22, width: "100%" }}>
              {stepLabel.map((l, i) => {
                const active = b.step === i + 1;
                const done_ = b.step > i + 1;
                const GOLD = "#c9a84c";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: active ? GOLD : done_ ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.15)",
                          border: `2px solid ${active ? GOLD : done_ ? GOLD : "rgba(255,255,255,0.55)"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all .3s",
                          flexShrink: 0,
                        }}
                      >
                        {done_ ? (
                          <span style={{ color: GOLD, fontSize: 13, fontWeight: 900 }}>✓</span>
                        ) : (
                          <span style={{ color: active ? "#0D1B2A" : "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: 900, fontFamily: "system-ui,sans-serif" }}>
                            {i + 1}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 8,
                          color: active ? GOLD : done_ ? "rgba(201,168,76,0.7)" : "rgba(255,255,255,0.6)",
                          fontFamily: "system-ui,sans-serif",
                          letterSpacing: 0.8,
                          marginTop: 6,
                          textAlign: "center",
                          fontWeight: active ? 700 : 500,
                          lineHeight: 1.3,
                        }}
                      >
                        {l.toUpperCase()}
                      </div>
                    </div>
                    {i < stepLabel.length - 1 && (
                      <div
                        style={{
                          width: 28,
                          flexShrink: 0,
                          height: 1,
                          background: b.step > i + 1 ? "rgba(201,168,76,0.6)" : "rgba(255,255,255,0.3)",
                          marginBottom: 22,
                          transition: "all .3s",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* STEP 1 */}
        {!b.done && b.step === 1 && (
          <BookingStep1
            availCams={b.availCams}
            selCams={b.selCams}
            toggleCam={b.toggleCam}
            camImgIdx={b.camImgIdx}
            setCamImgIdx={b.setCamImgIdx}
            expandedCam={b.expandedCam}
            setExpandedCam={b.setExpandedCam}
            totalCamSelected={b.totalCamSelected}
            setStep={b.setStep}
            preselectedUnavailable={b.preselectedUnavailable}
            setCamQty={b.setCamQty}
          />
        )}

        {/* STEP 2 */}
        {!b.done && b.step === 2 && (
          <BookingStep2
            accessories={props.accessories}
            selAcc={b.selAcc}
            toggleAcc={b.toggleAcc}
            setAccQty={b.setAccQty}
            liveOrdersForCheck={b.liveOrdersForCheck}
            selSession={b.selSession}
            pickDate={b.pickDate}
            setPickDate={b.setPickDate}
            days={b.days}
            selectedCamList={b.selectedCamList}
            selCams={b.selCams}
            totalCamSelected={b.totalCamSelected}
            accCost={b.accCost}
            camCost={b.camCost}
            subtotal={b.subtotal}
            total={b.total}
            selDur={b.selDur}
            setSelDur={b.setSelDur}
            customDays={b.customDays}
            setCustomDays={b.setCustomDays}
            appliedRental={b.appliedRental}
            appliedDelivery={b.appliedDelivery}
            rentalDiscountAmt={b.rentalDiscountAmt}
            deliveryDiscountAmt={b.deliveryDiscountAmt}
            setStep={b.setStep}
            qtyBtn={qtyBtnHelper}
            inpS={inpSStyle}
          />
        )}

        {/* STEP 3 */}
        {!b.done && b.step === 3 && (
          <BookingStep3
            selectedCamList={b.selectedCamList}
            selCams={b.selCams}
            selAcc={b.selAcc}
            accessories={props.accessories}
            days={b.days}
            selSession={b.selSession}
            pickDate={b.pickDate}
            hasQuickSelect={b.hasQuickSelect}
            appliedDiscounts={b.appliedDiscounts}
            appliedRental={b.appliedRental}
            appliedDelivery={b.appliedDelivery}
            appliedTotal={b.appliedTotal}
            discountExpanded={b.discountExpanded}
            setDiscountExpanded={b.setDiscountExpanded}
            discountCode={b.discountCode}
            setDiscountCode={b.setDiscountCode}
            discountLoading={b.discountLoading}
            discountMsg={b.discountMsg}
            setDiscountMsg={b.setDiscountMsg}
            applyDiscount={b.applyDiscount}
            removeDiscount={b.removeDiscount}
            subtotal={b.subtotal}
            rentalDiscountAmt={b.rentalDiscountAmt}
            deliveryDiscountAmt={b.deliveryDiscountAmt}
            totalDiscountAmt={b.totalDiscountAmt}
            deliveryFeeCalc={b.deliveryFeeCalc}
            deliveryFee2Way={b.deliveryFee2Way}
            total={b.total}
            info={b.info}
            setInfo={b.setInfo}
            deliveryStreet={b.deliveryStreet}
            setDeliveryStreet={b.setDeliveryStreet}
            deliveryWard={b.deliveryWard}
            setDeliveryWard={b.setDeliveryWard}
            deliveryDistrict={b.deliveryDistrict}
            setDeliveryDistrict={b.setDeliveryDistrict}
            deliveryPickup={b.deliveryPickup}
            setDeliveryPickup={b.setDeliveryPickup}
            deliveryReturn={b.deliveryReturn}
            setDeliveryReturn={b.setDeliveryReturn}
            selfPickup={b.selfPickup}
            setSelfPickup={b.setSelfPickup}
            deliveryFees={props.deliveryFees}
            submitting={b.submitting}
            submitError={b.submitError}
            handleFinish={b.handleFinish}
            setStep={b.setStep}
          />
        )}

        {/* DONE SCREEN */}
        {b.done && (
          <BookingDone
            orderId={b.orderId}
            selectedCamList={b.selectedCamList}
            selCams={b.selCams}
            selAcc={b.selAcc}
            days={b.days}
            selSession={b.selSession}
            appliedDiscounts={b.appliedDiscounts}
            appliedTotal={b.appliedTotal}
            discountAmt={b.discountAmt}
            rentalDiscountAmt={b.rentalDiscountAmt}
            deliveryDiscountAmt={b.deliveryDiscountAmt}
            totalDiscountAmt={b.totalDiscountAmt}
            deliveryFeeCalc={b.deliveryFeeCalc}
            total={b.total}
            info={b.info}
            siteContent={props.siteContent}
            onClose={props.onClose}
            selfPickup={b.selfPickup}
            deliveryStreet={b.deliveryStreet}
            deliveryWard={b.deliveryWard}
            deliveryDistrict={b.deliveryDistrict}
            deliveryPickup={b.deliveryPickup}
            deliveryReturn={b.deliveryReturn}
          />
        )}
      </div>
    </div>
  );
}
