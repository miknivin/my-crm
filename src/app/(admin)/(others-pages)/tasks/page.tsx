import { Metadata } from "next";

import { getAppMetaTitle } from "@/app/lib/utils/metadata";
import TasksBoard from "@/components/page-components/TasksBoard";
import TasksHeader from "@/components/page-components/TasksHeader";

export const metadata: Metadata = {
  title: getAppMetaTitle("Tasks"),
  description: "",
};

export default function TasksPage() {
  return (
    <div>
      <TasksHeader />
      <TasksBoard />
    </div>
  );
}
