import React from 'react'

const ServiceSkeleton = () => {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-3 h-full flex flex-col animate-pulse">
      {/* Image Placeholder */}
      <div className="relative aspect-[16/10] w-full mb-4 overflow-hidden rounded-2xl bg-slate-100" />

      {/* Content Placeholder */}
      <div className="flex-1 flex flex-col px-1 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="h-4 bg-slate-100 rounded-full w-3/4" />
        </div>
        
        <div className="space-y-2">
          <div className="h-2 bg-slate-100 rounded-full w-full" />
          <div className="h-2 bg-slate-100 rounded-full w-5/6" />
        </div>

        <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-50">
          <div className="space-y-2">
            <div className="h-2 bg-slate-100 rounded-full w-12" />
            <div className="h-5 bg-slate-100 rounded-full w-20" />
          </div>
          
          <div className="w-10 h-10 rounded-full bg-slate-50" />
        </div>
      </div>
    </div>
  )
}

export default ServiceSkeleton
