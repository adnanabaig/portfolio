import React from "react";

export type ButtonType = "primary";

export interface ButtonProps {
  children: React.ReactNode;
  type?: ButtonType;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  classes?: string;
}

const Button = ({ children, type, onClick, classes = "" }: ButtonProps) => {
  if (type === "primary") {
    return (
      <button
        onClick={onClick}
        type="button"
        className="text-sm tablet:text-base p-1 laptop:p-2 m-1 laptop:m-2 rounded-lg text-white bg-[#0070F3] hover:bg-[#005BD1] transition-all duration-300 ease-out first:ml-0 hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/60"
      >
        {children}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      type="button"
      className={`text-sm tablet:text-base p-1 laptop:p-2 m-1 laptop:m-2 rounded-lg flex items-center transition-all ease-out duration-300 hover:bg-white/5 hover:scale-105 active:scale-100 tablet:first:ml-0 focus:outline-none focus:ring-2 focus:ring-[#0070F3]/40 ${classes}`}
    >
      {children}
    </button>
  );
};

export default Button;

