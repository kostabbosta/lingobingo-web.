import {appOrigin,authCookie,authFetch,getCookie,redirect,signInError} from '../../../../lib/oauth';
export const dynamic='force-dynamic';
export async function GET(req:Request){let origin:string;try{origin=appOrigin(req)}catch{return new Response('Invalid origin',{status:400})}const query=new URL(req.url).searchParams;
 if(query.has('error'))return signInError(origin,'google_cancelled');
 const code=query.get('code'),verifier=getCookie(req,'lb_pkce');
 if(!code||code.length>512||!/^[A-Za-z0-9_-]{43}$/.test(verifier))return signInError(origin,'google_expired');
 try{const session=await authFetch('token?grant_type=pkce',{auth_code:code,code_verifier:verifier}) as {access_token?:string;refresh_token?:string;expires_in?:number;user?:{email?:string;email_confirmed_at?:string}};
 if(!session.access_token||!session.refresh_token||!session.user?.email||!session.user.email_confirmed_at)return signInError(origin,'google_failed');
 return redirect(origin+'/#Dashboard',[authCookie('lb_signed_out','',origin,0),authCookie('lb_pkce','',origin,0),authCookie('lb_access',session.access_token,origin,Math.min(session.expires_in||3600,3600)),authCookie('lb_refresh',session.refresh_token,origin,2592000)]);
 }catch{return signInError(origin,'google_failed')}}
