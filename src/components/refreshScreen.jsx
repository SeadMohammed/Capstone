export default function Refresh() {
    return (
      <div className="LoadingScreen">
        <div className="LoadingContainer">
          <div className="LoadingIcon">
            <div className="RefreshIcon">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 4V9H4.58152M4.58152 9C5.24618 7.35652 6.43101 5.9604 7.96 5.05C9.48899 4.1396 11.2943 3.75 13.1005 3.94876C14.9067 4.14751 16.6018 4.92284 17.9375 6.17C19.2731 7.41716 20.1796 9.08053 20.522 10.9M4.58152 9H9M20 20V15H19.4185M19.4185 15C18.7538 16.6435 17.569 18.0396 16.04 18.95C14.511 19.8604 12.7057 20.25 10.8995 20.0512C9.09334 19.8525 7.39824 19.0772 6.06253 17.83C4.72682 16.5828 3.82042 14.9195 3.478 13.1M19.4185 15H15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          
          <div className="LoadingContent">
            <h2>Loading Finance</h2>
            <p>Securing your financial data...</p>
            
            <div className="LoadingDots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    );
  }
