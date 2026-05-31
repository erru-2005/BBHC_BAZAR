/**
 * Cross-portal cache invalidation & optimistic Redux sync after mutations.
 */
import { store } from '../store'
import {
  removeMasterItem,
  invalidateMasterCache,
  setMastersData,
  addMasterBlacklistedItem,
  removeMasterBlacklistedItem,
} from '../store/masterSlice'
import { invalidateSellerCache, setSellerProducts, setSellerOrders } from '../store/sellerSlice'
import { invalidateOutletCache, setOutletOrders } from '../store/outletSlice'
import { invalidateHomeCache } from '../store/dataSlice'
import { invalidateApiCache } from './api'
import { isCacheStale, CACHE_TTL, entityId } from '../utils/cacheUtils'
import {
  getSellers,
  getBlacklistedSellers,
  getBlacklistedOutletMen,
  getSellerMyProducts,
  getOrders,
  getProducts,
} from './api'
import { setHomeProducts } from '../store/dataSlice'

export { isCacheStale, CACHE_TTL }

/** Seller blacklisted — remove from active list, update blacklist cache. */
export const syncSellerBlacklisted = (sellerId, sellerSnapshot = null) => {
  const id = entityId({ id: sellerId })
  store.dispatch(removeMasterItem({ field: 'sellers', id }))
  store.dispatch(invalidateMasterCache(['blacklistedSellers']))
  if (sellerSnapshot) {
    store.dispatch(
      addMasterBlacklistedItem({
        field: 'blacklistedSellers',
        item: { ...sellerSnapshot, id: sellerSnapshot.id || sellerSnapshot._id || sellerId },
      })
    )
  }
  invalidateApiCache(['orders', 'products'])
}

/** Seller restored from blacklist. */
export const syncSellerUnblacklisted = (sellerId) => {
  const id = entityId({ id: sellerId })
  store.dispatch(removeMasterBlacklistedItem({ field: 'blacklistedSellers', id }))
  store.dispatch(invalidateMasterCache(['sellers']))
  invalidateApiCache(['orders', 'products'])
}

/** Outlet man blacklisted. */
export const syncOutletBlacklisted = (outletId, outletSnapshot = null) => {
  const id = entityId({ id: outletId })
  store.dispatch(removeMasterItem({ field: 'outlets', id }))
  store.dispatch(invalidateMasterCache(['blacklistedOutlets']))
  if (outletSnapshot) {
    store.dispatch(
      addMasterBlacklistedItem({
        field: 'blacklistedOutlets',
        item: { ...outletSnapshot, id: outletSnapshot.id || outletSnapshot._id || outletId },
      })
    )
  }
}

export const syncOutletUnblacklisted = (outletId) => {
  const id = entityId({ id: outletId })
  store.dispatch(removeMasterBlacklistedItem({ field: 'blacklistedOutlets', id }))
  store.dispatch(invalidateMasterCache(['outlets']))
}

/** After catalog mutations (create/update/delete product or service). */
export const syncCatalogMutation = (keys = ['products', 'services', 'sellerProducts']) => {
  invalidateApiCache(keys)
  store.dispatch(invalidateHomeCache())
  store.dispatch(invalidateSellerCache(['products']))
}

export const syncOrderMutation = () => {
  invalidateApiCache(['orders'])
  store.dispatch(invalidateSellerCache(['orders']))
  store.dispatch(invalidateOutletCache())
  store.dispatch(invalidateMasterCache(['orders']))
}

/** Background refresh of stale master lists (tab focus / visibility). */
export const refreshStaleMasterData = async (dispatch) => {
  const { master } = store.getState()
  if (!master) return

  const tasks = []

  if (isCacheStale(master.lastFetched.sellers, CACHE_TTL.master)) {
    tasks.push(
      getSellers({ limit: 100 }).then((data) =>
        dispatch(setMastersData({ field: 'sellers', data: data.sellers || [] }))
      )
    )
  }

  if (isCacheStale(master.lastFetched.blacklistedSellers, CACHE_TTL.master)) {
    tasks.push(
      getBlacklistedSellers().then((data) =>
        dispatch(setMastersData({ field: 'blacklistedSellers', data: data || [] }))
      )
    )
  }

  if (isCacheStale(master.lastFetched.blacklistedOutlets, CACHE_TTL.master)) {
    tasks.push(
      getBlacklistedOutletMen().then((data) =>
        dispatch(setMastersData({ field: 'blacklistedOutlets', data: data || [] }))
      )
    )
  }

  if (isCacheStale(master.lastFetched.orders, CACHE_TTL.master)) {
    tasks.push(
      getOrders({ page: 1, limit: 10 }, { forceRefresh: true }).then((res) =>
        dispatch(setMastersData({ field: 'orders', data: res.orders || [] }))
      )
    )
  }

  if (tasks.length === 0) return
  await Promise.allSettled(tasks)
}

export const refreshStaleSellerData = async (dispatch) => {
  const { seller } = store.getState()
  if (!seller) return

  const tasks = []

  if (isCacheStale(seller.lastFetched.products, CACHE_TTL.seller)) {
    tasks.push(
      getSellerMyProducts({}, { forceRefresh: true }).then((products) =>
        dispatch(setSellerProducts(products))
      )
    )
  }

  if (isCacheStale(seller.lastFetched.orders, CACHE_TTL.seller)) {
    tasks.push(
      getOrders({ page: 1, limit: 50 }, { forceRefresh: true }).then((res) => {
        const orders = Array.isArray(res?.orders) ? res.orders : []
        dispatch(setSellerOrders(orders))
      })
    )
  }

  if (tasks.length === 0) return
  await Promise.allSettled(tasks)
}

export const refreshStaleOutletData = async (dispatch) => {
  const { outlet } = store.getState()
  if (!outlet) return

  if (!isCacheStale(outlet.lastFetched, CACHE_TTL.outlet)) return

  try {
    const res = await getOrders({ page: 1, limit: 50 }, { forceRefresh: true })
    const orders = Array.isArray(res?.orders) ? res.orders : Array.isArray(res) ? res : []
    dispatch(setOutletOrders(orders))
  } catch {
    // ignore background refresh errors
  }
}

export const refreshStaleUserHome = async (dispatch) => {
  const { data } = store.getState()
  const ts = data?.home?.productsCacheTimestamp
  if (!isCacheStale(ts, CACHE_TTL.userHome)) return

  try {
    const products = await getProducts({}, { forceRefresh: true })
    dispatch(setHomeProducts(products))
  } catch {
    // ignore
  }
}
