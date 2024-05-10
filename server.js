const express = require('express');
const https = require('https');
require('dotenv').config();
const app = express();
const PORT = 3000;
const path = require('path');
app.use(express.json());

let voiceMap = {};

// Extract the ELEVENLABS_API_KEY from environment variables
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
const el_stability = process.env.BASE_STABILITIY;
const el_similarity = process.env.BASE_SIMILARITY;
const el_styleEx = process.env.BASE_STYLE_EXAGGERATION;
const el_speakerBoost = process.env.USE_SPEAKER_BOOST;


// Serve the main page from the 'public' directory
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Function to load voice data from ElevenLabs and populate the voiceMap
function loadVoiceData() {
  console.log("Loading voice data from ElevenLabs...");
  const options = {
    hostname: 'api.elevenlabs.io',
    path: '/v1/voices',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': elevenLabsApiKey  // Use process.env.ELEVENLABS_API_KEY in production
    }
  };

  const req = https.request(options, (res) => {
    let chunks = [];
    res.on('data', (chunk) => {
      chunks.push(chunk);
    });

    res.on('end', () => {
      if (res.statusCode === 200) {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        body.voices.forEach(voice => {
          voiceMap[voice.name.toLowerCase()] = voice.voice_id;
        });
        console.log("Voice mapping completed:", voiceMap);
      } else {
        console.error(`Failed to load voice data: ${res.statusCode}`);
      }
    });
  });

  req.on('error', (e) => {
    console.error('Error fetching voice data:', e.message);
  });

  req.end();
}

loadVoiceData();

function ttsToElevenLabs(voiceId, text, callback) {
  
  //const voiceId = voiceMap[voiceName];
  
  /*
  console.log('\n\n\n----Looking for ' + voiceName + ' in voice map');
  console.log(voiceMap);
  console.log(Object.values(voiceMap).indexOf(voiceId));
  console.log('\n\n\n');
  
  if (Object.values(voiceMap).indexOf(voiceId) == -1) {
    console.error(`Voice name '${voiceName}' not found in voiceMap.`);
    callback(`Voice name '${voiceName}' not found.`);
    return;
  }
  */

  const voiceName = Object.keys(voiceMap).find(key => voiceMap[key] === voiceId)
  console.log(`Starting TTS for voiceName: ${voiceName} with voiceId: ${voiceId} and text: ${text.slice(0, 30)}...`);
  const data = JSON.stringify({
    voiceId: voiceId,
    text: text,
    model: 'eleven_turbo_v2',
    voice_settings: {
      "similarity_boost": process.env.BASE_SIMILARITY,
      "stability": process.env.BASE_STABILITIY,
      "style": process.env.BASE_STYLE_EXAGGERATION,
      "use_speaker_boost": process.env.USE_SPEAKER_BOOST
    },
    audioFormat: 'mp3'
  });
  
  console.log('Sending request with settings');
  console.log(JSON.parse(data));

  const options = {
    hostname: 'api.elevenlabs.io',
    path: `/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=0`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': elevenLabsApiKey
    }
  };

  const req = https.request(options, (res) => {
    let chunks = [];
    res.on('data', (chunk) => {
      chunks.push(chunk);
    });

    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`TTS request for ${voiceName} successful, processing audio data...`);
        callback(null, Buffer.concat(chunks));
      } else {
        const body = Buffer.concat(chunks).toString();
        console.error(`API responded with status ${res.statusCode} for ${voiceName}:`, body);
        callback(`Failed to synthesize speech for ${voiceName}: ${body}`);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Error making HTTPS request for ${voiceName}:`, e.message);
    callback(`Request error for ${voiceName}: ${e.message}`);
  });

  req.write(data);
  req.end();
}

app.get('/voices', (req, res) => {
	console.log('Got request to return voice map');
	console.log(voiceMap);
	res.json(voiceMap);
});

app.post('/text-to-speech', (req, res) => {
  const { text } = req.body;
  console.log("\n--Received text-to-speech request from client with text:", text.slice(0, 30));
  
  if(!text || text.length === 0){
	  console.log('No text to read. Returning null');
	  return null;
  }
  
  const voiceRegex = /\[(.*?)\](.*?)\[\/\1\]/gs;
  let match;
  let tasks = [];
  
  while ((match = voiceRegex.exec(text)) !== null) {
    const voiceName = match[1];
    const chunkText = match[2];
    console.log(`Processing chunk for voiceName ${voiceName} with text: ${chunkText.slice(0, 30)}...`);
    // Create a task for each chunk and handle success or error individually
    tasks.push(new Promise((resolve) => {
      ttsToElevenLabs(voiceName, chunkText, (error, audioData) => {
        if (error) {
          console.error(`Error in TTS for voiceName ${voiceName}:`, error);
          resolve(null); // Resolve with null to indicate failure but continue processing other chunks
        } else {
          console.log(`Successfully processed TTS for voiceName ${voiceName}.`);
          resolve(audioData); // Resolve with actual audio data on success
        }
      });
    }));
  }

  // Aggregate results, filtering out any nulls from failed tasks
  Promise.all(tasks).then(audioChunks => {
    const successfulChunks = audioChunks.filter(chunk => chunk !== null);
    if (successfulChunks.length === 0) {
      console.error('No successful audio chunks were processed.');
      res.status(500).send('Failed to process any text-to-speech segments.');
    } else {
      console.log("Some audio chunks processed successfully, sending data back to client...");
      res.type('audio/mp3');
      res.send(Buffer.concat(successfulChunks));
    }
  }).catch(error => {
    console.error('Error processing text-to-speech:', error);
    res.status(500).send('Failed to process text-to-speech');
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
