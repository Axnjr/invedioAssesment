import { useState, useEffect, useRef } from 'react'
import './index.css'
import init, { evaluate_expression } from "../pkg/wasm_lib";
import SyntaxHighlighter from 'react-syntax-highlighter';
import { codeStyles } from './codeStyle';
import { WebGLApp } from "./webgl"

function App() {
	const [expression, setExpression] = useState('');
	const [description, setDescription] = useState('');
	const [shaderCode, setShaderCode] = useState('');
    const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [result, setResult] = useState('');
	const canvasRef = useRef(null);

	const cleanShaderCode = (shaderCode) => {
		// Remove the version line (`#version 300 es`)
		shaderCode = shaderCode.replace(/^#version\s+\d+\s+es/gm, '');

		// Optionally remove comments (e.g., // comments or block comments)
		shaderCode = shaderCode.replace(/\/\/.*$/gm, '');  // remove single-line comments
		shaderCode = shaderCode.replace(/\/\*[\s\S]*?\*\//g, '');  // remove block comments

		// Remove the backticks if you want the shader as a simple string
		shaderCode = shaderCode.replace(/`/g, '');
		shaderCode = shaderCode.replace(/`glsl/g, "");

		return shaderCode.trim();
	};

	const renderShader = (shaderCode) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            setError('Canvas element not found.');
            return false;
        }

        const gl = canvas.getContext('webgl');
        if (!gl) {
            setError('WebGL not supported in this browser.');
            return false;
        }

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Vertex Shader
        const vertexShaderSource = `
            attribute vec4 aPosition;
            void main() {
                gl_Position = aPosition;
            }
        `;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            setError('Vertex Shader Error: ' + gl.getShaderInfoLog(vertexShader));
            return false;
        }

        // Fragment Shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, shaderCode);
        gl.compileShader(fragmentShader);
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            setError('Fragment Shader Error: ' + gl.getShaderInfoLog(fragmentShader));
            return false;
        }

        // Program
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            setError('Shader Program Link Error: ' + gl.getProgramInfoLog(shaderProgram));
            return false;
        }
        gl.useProgram(shaderProgram);

        // Buffer and Rendering
        const vertices = new Float32Array([
            -1.0, -1.0,
            1.0, -1.0,
            -1.0, 1.0,
            1.0, 1.0,
        ]);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const position = gl.getAttribLocation(shaderProgram, 'aPosition');
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(position);

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        return true;
    };

    const generateShader = async () => {
        setLoading(true);
        try {
            const response = await fetch(`https://invedioassesment.onrender.com/generate_shader?description=${encodeURIComponent(description)}`);
            console.log(`HTTP Status: ${response.status}`);
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error Response Data:', errorData);
                setError(`Server error: ${response.status} - ${response.statusText}`);
                return;
            }
            try {
                const data = await response.json();
                console.log('Parsed Response Data:', data.shader_code);
                if (data.shader_code) {
                    if (renderShader(data.shader_code)) {
                        setShaderCode(cleanShaderCode(data.shader_code));
                    } else {
                        setError('Generated shader code doesnt seem like working, if you can spot what the llm did wrong 🧠🤔🥲');
						setShaderCode(getFallbackShader(data.shader_code));
                    }
                } else {
                    setError(data.error || 'Shader code not received.');
                }
            } catch (jsonError) {
                console.error('JSON Parsing Error:', jsonError);
                setError('Failed to parse server response.');
            }
        } catch (fetchError) {
            console.error('Fetch Error:', fetchError);
            setError('Request failed. Please check your connection.');
        }
        setLoading(false);
    };

	const getFallbackShader = (code) => `
		${cleanShaderCode(code)}

        precision mediump float;
        void main() {
            gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0); // Blue color
        }
    `;

	useEffect(() => {
		init().then(() => {
			console.log("WASM FILE LOADED !!")
		})
	}, [])

	const calculate = async () => {
		try {
			const res = evaluate_expression(expression);
			setResult(res);
		} catch (e) {
			setResult('Error: ' + e.message);
		}
	};

	return (
		<main className="bg-neutral-950 text-neutral-300 w-full h-fit min-h-screen m-0 p-0 flex text-center justify-center items-top">
			<div className='w-1/2 h-full border-l border-neutral-600'>
				<div className='w-full h-16 border-b items-center justify-center flex border-neutral-600'>
					<h1 className='text-2xl tracking-tighter'>Rust WASM Calculater</h1>
				</div>
				<input
					type="text"
					value={expression}
					onChange={(e) => setExpression(e.target.value)}
					placeholder="Enter an expression (e.g., 2+2)"
					className='bg-transparent border outline-none border-neutral-600 p-10 h-40 text-4xl w-full'
				/>
				<button className='w-full h-12 hover:bg-purple-500 bg-white text-black' onClick={calculate}>Calculate</button>
				<h1 className='mt-24 text-purple-500 text-9xl font-black m-4'>{result == "Error: undefined" ? 0 : result}</h1>
			</div>
			<div className='w-1/2 h-fit border-l border-neutral-600 text-white'>
				<div className='w-full h-16 border-b items-center justify-center flex border-neutral-600'>
					<h1 className='text-2xl tracking-tighter'>LLM Text-to-Shader</h1>
				</div>
				<input
					type="text"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="Enter a webgl description (e.g. rotating cube)"
					className='bg-transparent border outline-none border-neutral-600 p-10 h-40 text-2xl w-full text-white'
				/>
				<button className='w-full h-12 hover:bg-purple-500 bg-white text-black' onClick={generateShader}>
                    {loading ? "Loading ..." : "Generate"}
                </button>

				{shaderCode && (
					<div className='text-left'>
						{
						error ? 
						<p className='bg-red-500 p-2'>{error}</p>
							:
						<>
							<h3>THE SHADER CANVAS</h3>
							<canvas
								id='webgl'
								ref={canvasRef}
								className='w-full h-fit border rounded-md'
							></canvas>
						</>
						}
						<SyntaxHighlighter language="glsl" style={codeStyles} showLineNumbers>
							{shaderCode}
						</SyntaxHighlighter>
					</div>
				)}
			</div>
		</main>
	);
}

export default App
