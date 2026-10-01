import Header from "@/components/Header";
import { documents } from "./documents";

export default function Home() {
  return (
    <>
      <Header activeTab="documents" showDraftStatus={false} />
      <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
        <h1 className="text-center">Hey there 👋</h1>
        <p className="mx-auto mt-4 max-w-xl text-center">
          Grab your class files below. Hit download, unzip it, and you&apos;re good to go.
        </p>

        <ul className="mt-12 space-y-4">
          {documents.map((doc) => (
            <li
              key={doc.file}
              className="flex flex-col gap-4 rounded-xl border border-border bg-gray-900/40 p-6 transition hover:border-blue-600/60 hover:bg-gray-900/70 sm:flex-row sm:items-center sm:justify-between"
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
                className="shrink-0 rounded-full bg-blue-600 px-6 py-3 text-center font-semibold text-white shadow-lg transition duration-300 ease-in-out hover:bg-blue-700"
              >
                Download
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center !text-sm text-gray-500">
          More files will show up here as the class goes on, so check back anytime.
        </p>
      </main>
    </>
  );
}
