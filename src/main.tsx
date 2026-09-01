import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import { ToastProvider } from "./lib/toast";
import { TooltipRoot } from "./lib/ui";
import { Shell } from "./app/Shell";
import { Dashboard } from "./routes/Dashboard";
import { Materials } from "./routes/Materials";
import { NoteEditor } from "./routes/NoteEditor";
import { Notes } from "./routes/Notes";
import { Settings } from "./routes/Settings";
import { StudentProfile } from "./routes/StudentProfile";
import { Students } from "./routes/Students";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The data lives on this machine: reads are cheap, staleness is the only
      // real risk, so refetch freely and never show a spinner for cached data.
      staleTime: 0,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const router = createHashRouter([
  {
    path: "/",
    element: <Shell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "students", element: <Students /> },
      { path: "students/:id", element: <StudentProfile /> },
      { path: "notes", element: <Notes /> },
      { path: "notes/new", element: <NoteEditor /> },
      { path: "notes/:id", element: <NoteEditor /> },
      { path: "materials", element: <Materials /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipRoot>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </TooltipRoot>
    </QueryClientProvider>
  </StrictMode>,
);
