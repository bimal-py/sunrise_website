import type { Metadata } from "next";
import { routes } from "@/lib/routes";
import { addFilm } from "@/features/films/presentation/actions/films";
import { requireAdmin } from "@/features/dashboard/data/auth";
import { DashboardButton } from "@/features/dashboard/presentation/components/ui/dashboard-button";
import { DashboardForm } from "@/features/dashboard/presentation/components/ui/dashboard-form";
import { DashboardPageHeader } from "@/features/dashboard/presentation/components/ui/dashboard-page-header";
import { DashboardField, DashboardInput } from "@/features/dashboard/presentation/components/ui/dashboard-ui";

export const metadata: Metadata = { title: "Add a film" };
// Adding reads the video from YouTube and builds its thumbnail.
export const maxDuration = 60;

export default async function NewFilmPage() {
  await requireAdmin();
  return (
    <div className="grid gap-8">
      <DashboardPageHeader
        eyebrow="Films"
        title="Add a film by link"
        description="For one video at a time: any upload, even one the sync skips (a Short, or a video from another channel). Its title, date, length and thumbnail come from YouTube; you can change them next."
        actions={<DashboardButton href={routes.dashboardSection("films")}>Back to films</DashboardButton>}
      />
      <DashboardForm action={addFilm} submitLabel="Add film" pendingLabel="Adding…">
        <DashboardField
          label="YouTube link or video id"
          required
          help="Copy the address from the video's page on YouTube (or Share → Copy link) and paste it here."
          example="https://youtu.be/xZHzDT7CFSs"
          hint="Watch, youtu.be, Shorts and live links all work."
        >
          <DashboardInput name="video" type="text" inputMode="url" maxLength={500} placeholder="https://www.youtube.com/watch?v=…" autoComplete="off" spellCheck={false} autoFocus />
        </DashboardField>
      </DashboardForm>
    </div>
  );
}
