A simple node.js application that will connect to your Elevenlabs account and allows for 'conversational' text to speech. You can tag blocks of text with the desired voice, insert delays, and then download the entire conversation once playback has completed. 

To run
1) Install Node.Js if you havn't already
2) Download the code zip file, extract it to a folder.
3) Navigate to the extracted contents. Modify the .env to contain your API key
4) Start a command prompt window in the project folder. 
5) Type node server.js and press enter. You should get a listing of all the available voices in the window.
6) In your browser navigate to 127.0.0.1:3000
7) Create your converstation!

You can specify which voice to use by enclosing blocks of text with tags like [voice1] I will be read in voice1[/voice1]. You can use the drop down menu at the top to quickly insert voice block tags into the messages box. You may also insert delays by using [delay] number of seconds to wait until next line[delay]. Delays can currently only be used in between different voice blocks, not within them. When playback is completed a download link will be made available to download the entire conversation in one combined mp3 file.
