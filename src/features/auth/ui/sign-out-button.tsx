import { signOut } from "@/features/auth/model/auth-actions";

type SignOutButtonProps = {
  label?: string;
  nextPath?: string;
};

export function SignOutButton({ label = "로그아웃", nextPath }: SignOutButtonProps) {
  return (
    <form action={signOut}>
      {nextPath ? <input name="next" type="hidden" value={nextPath} /> : null}
      <button className="sign-out-button" type="submit">
        {label}
      </button>
    </form>
  );
}
