import React from 'react'

const DetailSkeleton = () => {
  return (
    <div className="min-h-screen bg-[#fafbff] text-slate-900 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-12">
        {/* Back button skeleton */}
        <div className="h-4 bg-slate-200 rounded-full w-32 mb-8" />

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-16">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-8">
            <div className="aspect-[16/10] rounded-[40px] bg-slate-200" />
            
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-square rounded-3xl bg-slate-100" />
              ))}
            </div>

            <div className="bg-white rounded-[40px] p-8 lg:p-10 border border-slate-100 space-y-4">
              <div className="h-8 bg-slate-200 rounded-full w-48" />
              <div className="space-y-2">
                <div className="h-3 bg-slate-100 rounded-full w-full" />
                <div className="h-3 bg-slate-100 rounded-full w-full" />
                <div className="h-3 bg-slate-100 rounded-full w-3/4" />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-[40px] p-8 lg:p-10 border border-slate-100 space-y-6">
              <div className="h-4 bg-slate-100 rounded-full w-24" />
              <div className="h-10 bg-slate-200 rounded-full w-full" />
              <div className="h-8 bg-slate-200 rounded-full w-32" />
              
              <div className="space-y-4 pt-4">
                <div className="h-16 bg-slate-50 rounded-3xl w-full" />
                <div className="h-16 bg-slate-50 rounded-3xl w-full" />
              </div>

              <div className="pt-6 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3">
                    <div className="w-5 h-5 bg-slate-200 rounded-full flex-shrink-0" />
                    <div className="h-4 bg-slate-100 rounded-full w-full" />
                  </div>
                ))}
              </div>

              <div className="pt-8 space-y-4">
                <div className="h-16 bg-slate-200 rounded-3xl w-full" />
                <div className="h-16 bg-slate-100 rounded-3xl w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetailSkeleton
