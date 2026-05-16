/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";

interface ParsedContact {
  [key: string]: string;
}

interface AddContactFormProps {
  onClose: () => void;
  onFileUpload: (contacts: ParsedContact[], headers: string[], fileName: string) => void;
}

export default function BulkUploadComponent({ onClose, onFileUpload }: AddContactFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (fileExtension === "csv") {
      Papa.parse(file, {
        complete: (result) => {
          const data = result.data as string[][];
          if (data.length > 0) {
            const headers = data[0];
            const contacts = data.slice(1).map((row) => {
              const contact: ParsedContact = {};
              headers.forEach((header, index) => {
                contact[header] = row[index] || "";
              });
              return contact;
            });
            onFileUpload(contacts, headers, file.name);
          } else {
            toast.error("The uploaded CSV file is empty or invalid.");
          }
        },
        header: false,
        skipEmptyLines: true,
      });
    } else if (fileExtension === "xlsx" || fileExtension === "xls") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        if (json.length > 0) {
          const headers = json[0];
          const contacts = json.slice(1).map((row) => {
            const contact: ParsedContact = {};
            headers.forEach((header, index) => {
              contact[header] = row[index]?.toString() || "";
            });
            return contact;
          });
          onFileUpload(contacts, headers, file.name);
        } else {
          toast.error("The uploaded Excel file is empty or invalid.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error("Please upload a valid CSV or Excel file.");
    }

    // Reset the input value to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <h2 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
        Upload CSV, XLSX, XLS
      </h2>
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor="dropzone-file"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 16"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
              />
            </svg>
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              CSV, XLSX, XLS (Excel files only)
            </p>
          </div>
          <input
            id="dropzone-file"
            type="file"
            className="hidden"
            accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileUpload}
            ref={fileInputRef}
          />
        </label>
      </div>
    </>
  );
}