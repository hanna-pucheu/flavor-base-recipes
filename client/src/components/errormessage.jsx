function ErrorMessage({ error }) {
  if (!error) return null;
  return (
    <div className="error">
      Error: {error.message || String(error)}
    </div>
  );
}

export default ErrorMessage;
