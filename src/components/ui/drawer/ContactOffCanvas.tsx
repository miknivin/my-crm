"use client";

import FilterForm from "@/components/form/contactFilter/FilterForm";

interface ContactOffCanvasProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactOffCanvas({ isOpen, onClose }: ContactOffCanvasProps) {
 

  return (
    <FilterForm isOpen={isOpen} onClose={onClose}/>
  );
}