import { test as base } from '@playwright/test'

/** Vite overlay 자동 제거 + DEV2 API 환경 설정 커스텀 test fixture */
export const test = base.extend({
  page: async ({ page }, use) => {
    // localhost에서 DEV2 API 서버를 사용하도록 sessionStorage 설정
    // addInitScript는 모든 네비게이션 전에 실행되어 앱 코드보다 먼저 sessionStorage를 설정
    await page.addInitScript(() => {
      window.sessionStorage.setItem('SESSION_DEV_API_URL', 'DEV2')
    })
    // 모든 페이지 이동 후 Vite checker 오버레이 자동 제거
    page.on('load', async () => {
      await page.evaluate(() => {
        document.querySelectorAll('vite-plugin-checker-error-overlay').forEach((el) => el.remove())
      }).catch(() => {})
    })
    await use(page)
  },
})

export { expect } from '@playwright/test'
