
import { useState, useEffect } from 'react';
import axios from 'axios'; // Import axios

// Define a type for the data we expect from our API
interface ApiResponse {
    message: string;
}

function App() {
    // Tell TypeScript that our 'message' state will be a string
    const [message, setMessage] = useState<string>('Loading...');

    // useEffect hook to fetch data when the component loads
    useEffect(() => {
        // Tell axios what kind of response data to expect
        axios.get<ApiResponse>('http://127.0.0.1:8000/')
            .then(response => {
                // TypeScript knows 'response.data' has a 'message' property!
                setMessage(response.data.message);
            })
            .catch(error => {
                console.error("There was an error fetching the data:", error);
                setMessage('Failed to connect to the backend.');
            });
    }, []); // The empty array [] means this effect runs only once

    return (
        <div style={{ padding: '40px', textAlign: 'center', fontSize: '24px' }}>
            <h1>MTGA Analyzer Frontend</h1>
            <p>Message from backend:</p>
            <p style={{ fontWeight: 'bold', color: '#007BFF' }}>
                {message}
            </p>
        </div>
    );
}

export default App;