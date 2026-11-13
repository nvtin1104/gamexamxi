/**
 * Gamexamxi Hub Bridge — nhúng vào mọi web game độc lập.
 *
 *   <script src="/hub-bridge.js" data-game-id="hoc-vien-phieu-luu"
 *           data-hub-origins="https://gamexamxi.com,http://localhost:5173" defer></script>
 *
 * - Hiện badge nổi "← Về Hub Chính" (phong cách Soft Neo-Brutalism).
 * - `GxHub.reportScore(n)`: gửi điểm về hub bằng postMessage (nếu mở dạng popup/iframe)
 *   và gắn `?gx_game=<id>&gx_score=<n>` khi người chơi bấm badge để quay về.
 * - Chỉ chấp nhận địa chỉ quay về (`?return=`) thuộc allowlist `data-hub-origins`
 *   → chặn open redirect.
 *
 * Không phụ thuộc thư viện nào, < 3KB.
 */
;(function () {
  'use strict'

  var script = document.currentScript
  var gameId = (script && script.dataset.gameId) || ''
  var allowed = ((script && script.dataset.hubOrigins) || '')
    .split(',')
    .map(function (s) {
      return s.trim()
    })
    .filter(Boolean)

  if (!gameId || allowed.length === 0) {
    console.warn('[GxHub] Thiếu data-game-id hoặc data-hub-origins')
    return
  }

  var STORAGE_KEY = 'gx-hub:' + gameId
  var params = new URLSearchParams(window.location.search)

  function safeOrigin(value) {
    try {
      var origin = new URL(value).origin
      return allowed.indexOf(origin) !== -1 ? origin : null
    } catch (e) {
      return null
    }
  }

  // Lưu origin hub từ lần vào đầu tiên (người chơi có thể chuyển trang trong game)
  var hubOrigin = safeOrigin(params.get('return') || '')
  try {
    if (hubOrigin) sessionStorage.setItem(STORAGE_KEY + ':hub', hubOrigin)
    else hubOrigin = safeOrigin(sessionStorage.getItem(STORAGE_KEY + ':hub') || '')
  } catch (e) {}
  if (!hubOrigin) hubOrigin = allowed[0]

  var bestScore = 0

  function reportScore(score) {
    var n = Math.floor(Number(score))
    if (!isFinite(n) || n < 0) return
    bestScore = Math.max(bestScore, n)
    var message = { type: 'gx:score', gameId: gameId, score: bestScore }
    // targetOrigin cụ thể — không bao giờ dùng '*'
    if (window.opener && window.opener !== window) window.opener.postMessage(message, hubOrigin)
    if (window.parent && window.parent !== window) window.parent.postMessage(message, hubOrigin)
  }

  function backUrl() {
    var url = new URL('/', hubOrigin)
    if (bestScore > 0) {
      url.searchParams.set('gx_game', gameId)
      url.searchParams.set('gx_score', String(bestScore))
    }
    return url.toString()
  }

  function mountBadge() {
    var a = document.createElement('a')
    a.href = backUrl()
    a.textContent = '← Về Hub Chính'
    a.setAttribute('aria-label', 'Quay về trang chủ Gamexamxi')
    a.style.cssText = [
      'position:fixed',
      'left:16px',
      'bottom:16px',
      'z-index:2147483000',
      'padding:10px 16px',
      'font:700 14px/1.2 "Be Vietnam Pro",system-ui,sans-serif',
      'color:#1E1E24',
      'background:#FFAAA5',
      'border:2px solid #1E1E24',
      'border-radius:12px',
      'box-shadow:4px 4px 0 #1E1E24',
      'text-decoration:none',
      'transition:transform .14s ease,box-shadow .14s ease',
    ].join(';')
    a.addEventListener('mouseenter', function () {
      a.style.transform = 'translate(-2px,-2px)'
      a.style.boxShadow = '6px 6px 0 #1E1E24'
    })
    a.addEventListener('mouseleave', function () {
      a.style.transform = ''
      a.style.boxShadow = '4px 4px 0 #1E1E24'
    })
    // Cập nhật điểm vào link ngay trước khi rời trang
    a.addEventListener('pointerdown', function () {
      a.href = backUrl()
    })
    a.addEventListener('focus', function () {
      a.href = backUrl()
    })
    document.body.appendChild(a)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountBadge)
  else mountBadge()

  window.GxHub = { reportScore: reportScore, hubOrigin: hubOrigin, theme: params.get('theme') || 'soft-brutal' }
})()
