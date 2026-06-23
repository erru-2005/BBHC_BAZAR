import PropTypes from 'prop-types'
import confetti from 'canvas-confetti'
import { CircleCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from './ui/Dialog'

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900 break-words">{value}</span>
    </div>
  )
}

DetailRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
}

function formatStatus(status) {
  if (!status) return 'Processing'
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function OrderSuccessDialog({
  open,
  onClose,
  onViewOrders,
  onContinueShopping,
  productName,
  quantity,
  amount,
  orderNumber,
  status,
  isService = false,
  scheduleLabel = null
}) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (!open) {
      setShowConfetti(false)
      return
    }

    setShowConfetti(true)
    const timer = setTimeout(() => setShowConfetti(false), 4000)
    return () => clearTimeout(timer)
  }, [open])

  const canvasRef = useCallback((canvas) => {
    if (!canvas) return

    const myConfetti = confetti.create(canvas, {
      resize: true,
      useWorker: true
    })

    myConfetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    })
  }, [])

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose?.()
      }}
    >
      <DialogContent className="relative overflow-visible rounded-3xl border-slate-200 bg-white p-0 text-slate-900 shadow-2xl">
        {showConfetti && (
          <canvas
            className="pointer-events-none fixed inset-0 h-full w-full"
            ref={canvasRef}
            style={{ zIndex: 55 }}
          />
        )}

        <div className="relative z-20">
          <DialogBody className="flex flex-col items-center px-4 py-8 text-center sm:px-8 sm:py-10">
          <CircleCheck
            className="size-16 text-green-500 sm:size-[4.5rem]"
            strokeWidth={1.75}
            aria-hidden
          />

          <DialogTitle className="mt-5 text-xl font-semibold text-slate-900 sm:text-2xl">
            {isService ? 'Request Sent!' : 'Order Placed Successfully!'}
          </DialogTitle>

          <DialogDescription className="mt-2 max-w-sm text-center leading-relaxed text-slate-600">
            {isService
              ? 'Your booking request was successfully transmitted. Our professional partner will review it and notify you shortly.'
              : 'Your order has been placed successfully. You will receive a QR code once the seller accepts your order.'}
          </DialogDescription>

          <div className="mt-6 w-full space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left sm:p-5">
            <DetailRow label={isService ? 'Service' : 'Product'} value={productName} />
            {!isService ? (
              <DetailRow label="Quantity" value={quantity} />
            ) : scheduleLabel ? (
              <DetailRow label="Schedule" value={scheduleLabel} />
            ) : null}
            <DetailRow label="Amount" value={`₹${Number(amount).toLocaleString('en-IN')}`} />
            {orderNumber ? <DetailRow label={isService ? 'Ref #' : 'Order #'} value={orderNumber} /> : null}
            <DetailRow label="Status" value={formatStatus(status)} />
          </div>
          </DialogBody>

          <DialogFooter className="flex-col gap-2 border-slate-200 bg-white px-4 pb-4 sm:flex-row sm:gap-3 sm:px-6 sm:pb-6">
            {isService ? (
              <>
                <button
                  type="button"
                  onClick={onViewOrders}
                  className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:flex-1"
                >
                  Manage My Requests
                </button>
                <button
                  type="button"
                  onClick={onContinueShopping}
                  className="w-full rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:flex-1"
                >
                  Return Home
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onContinueShopping}
                  className="w-full rounded-full border border-slate-900 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 sm:flex-1"
                >
                  Continue Shopping
                </button>
                <button
                  type="button"
                  onClick={onViewOrders}
                  className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:flex-1"
                >
                  Orders
                </button>
              </>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

OrderSuccessDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  onViewOrders: PropTypes.func.isRequired,
  onContinueShopping: PropTypes.func.isRequired,
  productName: PropTypes.string.isRequired,
  quantity: PropTypes.number,
  amount: PropTypes.number.isRequired,
  orderNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  status: PropTypes.string,
  isService: PropTypes.bool,
  scheduleLabel: PropTypes.string
}

export default OrderSuccessDialog
