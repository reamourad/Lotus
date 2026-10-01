import Header from "@/components/Header";
import { documents } from "./documents";

export default function Home() {
  return (
    <>
      <Header activeTab="documents" showDraftStatus={false} />
      <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
        <h1 className="text-center">Documents</h1>
        <p className="mx-auto mt-4 max-w-xl text-center">
          Course materials for students. Download what you need below.
        </p>

        <ul className="mt-12 space-y-4">
          {documents.map((doc) => (
            <li
              key={doc.file}
              className="flex flex-col gap-4 rounded-lg border border-border bg-gray-900/40 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h3 className="!text-xl sm:!text-xl">{doc.title}</h3>
                <p className="mt-1 !text-sm text-gray-400">{doc.description}</p>
                <span className="mt-2 inline-block text-xs text-gray-500">
                  {doc.type} · {doc.size}
                </span>
              </div>
              <a
                href={`/downloads/${doc.file}`}
                download
                className="shrink-0 rounded-lg bg-blue-600 px-6 py-3 text-center font-semibold text-white shadow-lg transition duration-300 ease-in-out hover:bg-blue-700"
              >
                Download
              </a>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
