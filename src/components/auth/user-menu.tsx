import Link from "next/link";
import { signOut } from "@/actions/auth";

export function UserMenu({ username }: { username: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium text-slate-900">{username}</p>
        <p className="text-xs text-slate-500">Signed in</p>
      </div>
      <Link className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700" href="/settings">
        Settings
      </Link>
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
      >
        <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white" type="submit">
          Sign out
        </button>
      </form>
    </div>
  );
}
