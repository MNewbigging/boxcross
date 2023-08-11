import "./button.scss";

interface ButtonProps {
  text: string;
  onClick: () => void;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ text, onClick, className }) => {
  const classes = ["button", "white", className];
  return (
    <div className={classes.join(" ")} onClick={onClick}>
      <div>{text}</div>
    </div>
  );
};
