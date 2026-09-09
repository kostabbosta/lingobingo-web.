import {appOrigin,authCookie,authFetch,createPKCE,redirect,signInError} from '../../../../lib/oauth';
import {SUPABASE_URL} from '../../../../lib/supabase-config';
export const dynamic='force-dynamic';
export async function GET(req:Request){let origin:string;try{origin=appOrigin(req)}catch{return new Response('Invalid origin',{status:400})}try{
 const settings=await authFetch('settings') as {external?:{google?:boolean}};
 if(!settings.external?.google)return signInError(origin,'google_disabled');
 const {verifier,challenge}=await createPKCE();
 const query=new URLSearchParams({provider:'google',redirect_to:origin+'/api/auth/callback',code_challenge:challenge,code_challenge_method:'s256',scopes:'email profile',prompt:'select_account'});
 return redirect(SUPABASE_URL+'/auth/v1/authorize?'+query,[authCookie('lb_pkce',verifier,origin,600)]);
 }catch{return signInError(origin,'google_unavailable')}}
