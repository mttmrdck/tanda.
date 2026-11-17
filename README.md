# Isyarat

Teach the camera what your child already says.

## Manual real-camera test (cannot be automated)

1. `npm run dev`, open http://localhost:5173 in Chrome or Edge.
2. Sit about 1–1.5 m from the webcam so your shoulders and both hands are in view.
3. Open Live, choose **Camera**, allow the camera. Within a few seconds the status should read "Seeing the child".
4. Step out of view: after about 1 second the coach says it can't see the shoulders. Step back in: it recovers.
5. Turn on "Show skeleton": points and bones should follow your shoulders, elbows, wrists and hands. The preview is a mirror; raise your right hand and the skeleton on the right side of the screen moves.
6. Navigate to another page: the camera light must switch off.
