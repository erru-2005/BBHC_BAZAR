import React from 'react'

const DetailSkeleton = () => {
  return (
    <div className="min-h-screen bg-[#fafbff] text-slate-900 animate-pulse">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-5 lg:px-8 py-3 sm:py-5 lg:py-10">
        <div className="h-3.5 bg-slate-200 rounded-full w-28 mb-3 sm:mb-5" />

        <div className="flex flex-col gap-3 sm:gap-4 lg:grid lg:grid-cols-12 lg:gap-6">
          <div className="order-1 lg:col-span-7">
            <div className="aspect-[4/3] sm:aspect-[16/10] rounded-2xl bg-slate-200" />
            <div className="flex gap-2 mt-3 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-14 h-14 rounded-xl bg-slate-100 shrink-0" />
              ))}
            </div>
          </div>

          <div className="order-2 lg:col-span-5">
            <div className="bg-white rounded-2xl lg:rounded-[32px] p-4 sm:p-5 border border-slate-100 space-y-3">
              <div className="h-3 bg-slate-100 rounded-full w-20" />
              <div className="h-6 bg-slate-200 rounded-lg w-full" />
              <div className="h-7 bg-slate-200 rounded-lg w-28" />
              <div className="space-y-2 pt-1">
                <div className="h-3 bg-slate-100 rounded-full w-full" />
                <div className="h-3 bg-slate-100 rounded-full w-4/5" />
              </div>
              <div className="h-11 bg-slate-200 rounded-xl w-full mt-2" />
            </div>
          </div>

          <div className="order-3 lg:col-span-7">
            <div className="bg-white rounded-2xl lg:rounded-[32px] p-4 sm:p-5 border border-slate-100 space-y-3">
              <div className="h-5 bg-slate-200 rounded-lg w-40" />
              <div className="space-y-2">
                <div className="h-3 bg-slate-100 rounded-full w-full" />
                <div className="h-3 bg-slate-100 rounded-full w-full" />
                <div className="h-3 bg-slate-100 rounded-full w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetailSkeleton
