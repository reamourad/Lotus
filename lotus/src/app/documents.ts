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
  {
    title: "Linux Workshop Slides",
    description:
      "The full slide deck from the Linux Fundamentals workshop: SSH, the filesystem, essential commands, Bash tricks and Vim.",
    file: "Hexploit_Linux_Workshop.pdf",
    size: "401 KB",
    type: "PDF",
  },
  {
    title: "Linux Class Cheat Sheet",
    description:
      "A two-page quick reference for the commands we cover in class. Handy to keep open while you practice.",
    file: "Hexploit_Linux_Class_Cheat_Sheet_v3.pdf",
    size: "17 KB",
    type: "PDF",
  },
];
