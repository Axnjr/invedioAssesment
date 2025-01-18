import { useState, useEffect, useRef } from 'react'

export const WebGLApp = () => {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        const gl = canvas.getContext('webgl');
        // Vertex shader code
        const vertexShaderSource = `
        attribute vec2 position;
        
        void main() {
          gl_Position = vec4(position, 0, 1);
        }
      `;
        // Fragment shader code
        const fragmentShaderSource = `
        precision mediump float;
        void main() {
          gl_FragColor = vec4(1, 0, 0, 1); // Red color
        }
      `;
        // Create the vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);
        // Create the fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);
        // Create the shader program
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        gl.useProgram(shaderProgram);
        // Set up the position attribute
        const positionAttribute = gl.getAttribLocation(shaderProgram, 'position');
        gl.enableVertexAttribArray(positionAttribute);
        // Create the buffer for the position attribute
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        // Set up the position data
        const positions = [
            -1, -1,
            -1, 1,
            1, -1,
            1, 1,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        // Set up the position attribute pointer
        gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);
        // Render the shader program
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }, []);
    return <canvas ref={canvasRef} />;
};