# Film posters (2021, May)
### How to get the film's information from its poster using Augmented Reality and a free-access API
In this project we use **Three.js** library, **Visual Studio Code** as the text editor and the **API** offered by https://www.themoviedb.org/. The following steps will be showed in that we consider the best order to easily debug during the project's development, however, feel free to try it by your own. Due to the small size of this project, we do not use a complex framework like Angular, we only require a bundler like Webpack. In fact, you can try it without a module bundler, just with scripts created by yours.
1. Create an HTML with the basic tags and including a **canvas** (use _index.html_ in Webpack).
1. Create a JS script and import **Three.js** library (use _index.js_ in Webpack), after install it via _npm_.
1. Create a project at Onirix Studio (https://studio.onirix.com/) and includes as many scenes (_Image mode_) as posters to scan: one image per scene.
1. Mark your project as _public_ and copy the SDK Token Web (menus _Share_ and _Configuration_). For this and the following steps the **Onirix SDK doc** (https://docs.onirix.com/onirix-sdk/web-ar) may help you, too.
1. Load the Onirix Web SDK script (`<script src="https://sdk.onirix.com/0.1.0/ox-sdk.js"></script>`) in your _index.html_.
1. Create an object who includes _token_ (your Web SDK Token) and _mode_ (_OnirixSDK.TrackingMode.Image_ in this case).
1. Call the init function (with **config object** as a param), which returns a promise, that request camera and sensors access and returns a canvas, and put your code inside the `then` statement.
1. Instantiate the renderer, camera, lights and scene. Onirix SDK (`OX`) provides you the **camera parameters** via the function `static function getCameraParameters() : void`.
1. Subscribe to the **Onirix events**: `OnDetected`,`OnLost`,`OnPose` and `OnResize`.
1. When subscribed to `OnDetected` event, you must specify a callback, which receives a parameter: the **scanned image id**. Map this id to the corresponding film id on the API to get its information. The required **endpoint** for that is https://api.themoviedb.org/3/movie/film_id?api_key=api_key&language=en-US.
1. Use the information rescued from the API to create a plane and cover it with the image of the film as a texture. This plane will be the **background**. You can add another details you consider like some transparency. 
1. Load a **3D star model** in a loop limited by the rating fact and you will obtain a pretty representation of the film's valoration.
1. Render **3D texts** with the rest of the information you want to show. Be carefull with the line width. We suggest create a function that evaluate if it is necessary to **split the text** and, if split, not do it in the middle of a word. There are information that require more petitions. In our example, the cast and the trailers.
1. For the cast, you have to use this endpoint: https://api.themoviedb.org/3/movie/film_id/credits?api_key=api_key&language=en-US. Use a loop to create images like the previous background, using the **actors images**.
1. For the trailers, follow the same strategy, using a **video thumbnail** as texture and this endpoint: https://api.themoviedb.org/3/movie/film_id/videos?api_key=api_key&language=en-US.
1. Add an **event listener** to answer the click event. The callback function must render a **raycaster** and evaluate if **intersects** any of the objects you want to execute any action. For instance, in our project the actors' images redirect the user to their profiles and the trailers' representations to the corresponding video on Youtube. For this step, you must have **stored the links** (for example, in a Map where the `uuid` is the key and the link is the `value`) when you made the previous petitions.
1. When subscribed to the `OnPose` event, you should **update the 3D camera**.
1. When subscribed to the `OnResize` event, you should **update camera's params and renderer's size**.
1. When subscribed to the `OnLost` event, you should **remove** your models and shapes from the scene.