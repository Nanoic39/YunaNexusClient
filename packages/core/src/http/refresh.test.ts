import { beforeEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({ state:{refreshToken:'old',clientCode:'web'},setTokens:vi.fn(),cacheCsrf:vi.fn() }))
vi.mock('./session',()=>({session:{state:mocks.state,setTokens:mocks.setTokens}}))
vi.mock('./csrf',()=>({cacheCsrf:mocks.cacheCsrf}))
vi.mock('../env',()=>({readEnv:()=>({apiBaseUrl:'',enableCsrf:true})}))
import { refreshSession } from './refresh'
beforeEach(()=>{vi.clearAllMocks();mocks.state.refreshToken='old'})
function csrf(){return {ok:true,json:async()=>({code:200,data:{headerName:'X-XSRF-TOKEN',token:'csrf'}})}}
it('merges concurrent refreshes and includes required CSRF header',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(csrf()).mockResolvedValueOnce({ok:true,json:async()=>({code:200,data:{accessToken:'access',refreshToken:'new'}})})
 vi.stubGlobal('fetch',fetcher)
 const first=refreshSession();const second=refreshSession()
 expect(first).toBe(second)
 expect(await first).toBe(true)
 expect(fetcher).toHaveBeenCalledTimes(2)
 expect(fetcher.mock.calls[1][1].headers['X-XSRF-TOKEN']).toBe('csrf')
 expect(mocks.setTokens).toHaveBeenCalledTimes(1)
})
it('does not resurrect old session after logout or account switch',async()=>{
 let finish!:(value:unknown)=>void
 const fetcher=vi.fn().mockResolvedValueOnce(csrf()).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
 vi.stubGlobal('fetch',fetcher)
 const refreshing=refreshSession()
 await vi.waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(2))
 mocks.state.refreshToken='other-account'
 finish({ok:true,json:async()=>({code:200,data:{accessToken:'old-account',refreshToken:'old-account-next'}})})
 expect(await refreshing).toBe(false)
 expect(mocks.setTokens).not.toHaveBeenCalled()
})
it('refuses refresh if CSRF bootstrap is unavailable',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:false,json:async()=>({code:503})})
 vi.stubGlobal('fetch',fetcher)
 expect(await refreshSession()).toBe(false)
 expect(fetcher).toHaveBeenCalledTimes(1)
 expect(mocks.setTokens).not.toHaveBeenCalled()
})
