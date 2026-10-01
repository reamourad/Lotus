// To add a document: drop the file in public/downloads/ and add an entry here.
export interface DocumentItem {
  title: string;
  description: string;
  file: string; // filename inside public/downloads
  size: string;
  type: string;
}

export const documents: DocumentItem[] = [
  {
    title: "Linux Foundations for CTFs",
    description:
      "Your hands-on Linux practice pack: four practice rounds plus the final Ghost Drive challenge. Unzip it and open README_FIRST.txt to get started.",
    file: "linux_ctf_class.zip",
    size: "39 KB",
    type: "ZIP",
  },
];
