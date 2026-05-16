import React from 'react';

const EditIcon: React.FC = () => {
    return (
       <svg
      className="w-4 h-4 text-white"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        stroke="currentColor"
        strokeLinecap="square"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 19H5a1 1 0 01-1-1v-1a3 3 0 013-3h1m4-6a3 3 0 11-6 0 3 3 0 016 0zm7.441 1.559a1.907 1.907 0 010 2.698l-6.069 6.069L10 19l.674-3.372 6.07-6.07a1.907 1.907 0 012.697 0z"
      />
    </svg>

    );
};

export default EditIcon;