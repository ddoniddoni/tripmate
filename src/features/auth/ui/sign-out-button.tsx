import { signOut } from "@/features/auth/model/auth-actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button className="sign-out-button" type="submit">
        로그아웃
      </button>
    </form>
  );
}
