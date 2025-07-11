# Computer Graphics - Exercise 5+6 - WebGL Basketball Court

## HOW TO RUN THIS PROJECT:
1. Clone this repository to your local machine
2. Make sure you have Node.js installed
3. Start the local web server: `node index.js`
4. Open your browser and go to http://localhost:8000

## COMPLETED LIST OF IMPLEMENTED CONTROLS (EX6):
1. O - Toggle Orbit Camera
2. Arrow Left/Right - Move Ball Horizontally Across Court
3. Arrow Up/Down - Move Ball Forward/Backward On Court
4. W/S - Increase/Decrease Shot Power
5. Spacebar - Launch Ball
6. R - Reset Game

## DESCRIPTION OF PHYSICS SYSTEM IMPLEMENTATION (EX6):
- The physics system manually updates the basketball's position frame-by-frame using Vector3 arithmetic.
- Gravity is implemented as a constant acceleration (ballVelocity.y += gravity) that pulls the ball down during flight.
- The ball's motion is determined by a velocity vector that is set when a shot is taken and continuously updated during the animation loop.
- Bounces are simulated by inverting and scaling the Y component of the velocity when the ball hits the ground (ballVelocity.y *= -0.5).
- Rim collisions are handled with bounding box intersection checks (Box3.intersectsBox), and velocity is reduced and reflected when contact occurs.
- Shot validity is determined by checking that the ball passes through the rim from above and started far enough from the hoop.
- The ball's rotation is calculated based on the movement vector using rotateOnAxis, creating a visually realistic spinning motion.

## Group Members
**MANDATORY: Add the full names of all group members here:**
- Dana Jacobson
- Shir Raban
