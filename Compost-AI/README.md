## Summary
Compost AI is an AI-Powered Smart Bin designed to reduce food waste in school cafeterias. It is a component of **SchoolPulse AI**, which is a suite of edge AI toolds design to help reduce a school's environmental footprint. This directory contains the dataset, code, results, model weights, inference and web application of the Compost AI waste classification model/smartbin.

### Problem
***[One-third of all food in the United States goes uneaten](https://www.epa.gov/recycle/preventing-wasted-food-home)*** and ends up in our municipal solid waste stream. Fortunately, composting can solve this. Composting is a process of naturally recycling food scraps so that they can be used to create more nutrient rich soil. However, ***[96% of wasted food ended up in landfills](https://www.epa.gov/recycle/preventing-wasted-food-home)*** instead of being composted. This is for 2 reasons:

1. First, food scraps that are sent to composting are often mixed with non-compostable items like plastic and glass, so they are bundled together and sent to the landfill instead because [contamination facilities automatically reject any load of food waste that’s contaminated](https://www.wastedive.com/news/biocycle-2023-composting-survey-closed-loop/689945/)

2. Second, many schools [don’t have a compost bin](https://modernfarmer.com/2024/03/composting-makes-sense-why-dont-more-cities-do-it/) in their homes (This includes public places like airports, parks, supermarkets, etc. too)

### Solution
An AI smart bin that uses computer vision can re-route food waste from landfills to composting if it’s deployed at a massive scale. The “bin” will come with three bins inside of it: `garbage`, `recycling` and `compost`. The bin will also be connected to an app, which will have a dashboard that shows which items were sorted into which bin (human-in-the-loop to verify if AI output is correct) and will also send alerts to the school to let them know when a bin is full and they have to take it out.  

- **Software:** A CNN that can take an image of the waste items as input and determine if it belongs in either the garbage, recycling and compost.

- **Hardware:** A Raspberry Pi 4 to run model inference + camera module capture images of the inputted waste item + a container with three bins to hold sorted waste +ultrasonic sensor to detect when bin is full + 3 servo motors.

<br>

## Waste Classification Model (Software)
The [Recyclable and Household Waste Classification Dataset](https://www.kaggle.com/datasets/alistairking/recyclable-and-household-waste-classification) on Kaggle was used to train the Compost AI model. This dataset was chosen for 2 reasons:

1. It's a comprehensive dataset with over **15,000 images** across **30 classes** that covers wide range of categories including: `Plastic`, `Paper`, `Cardboard`, `Glass`, `Metal`, `Organic Waste` and `Textiles`.

2. The dataset offers 500 images per class, which is further split into 2 directories. The `default` folder offers a studio-image like representation of the waste item and the `real_world`folder offers images of the waste item in a real-world scenario. 

### Training
Compost AI used transfer learning from ImageNet weights and was built on an ***EfficientNet-B0*** backbone. The backbone is frozen during the first phase of training so that only the classification head learns. The head takes the backbone's feature map, pools it down to a single vector, runs it through a dropout-protected 256-unit dense layer with L2 regularization, and finishes with a softmax function outputing the probabilities of each of the 30 classes of waste. Overall the model contains **4,390,337** total parameters and **338,206** trainable parameters. 



### Results
Compost AI achieved a ***96.36 percent*** accuracy on disposal pathway adjusted accuracy. That means when given any input image of a waste item, it was able to correctly categorize the item into either garbage, recycling or compost ~96% of the time. In contrast, when Compost AI was evaluated on categorizing an input image of a waste item into one of the 30 classes of waste in the dataset, it only achieved an ***87.60 percent*** accuracy. 

Becuase there is more granularity among the classes, Compost AI initially had a lower accuracy rate; however, becuase our smart bin is only concerned with sorting waste items into one of the three disposal pathways and not determining what type of object the waste item is we can safely take the results of the disposal pathway adjusted accuracy which is ~96%. After quantizing the model files into a `.tflite` format so that it could run inference on a Raspberry Pi 4, the accuracy dropped to ***~92 percent***. 

<br>

<img src="https://github.com/user-attachments/assets/fec5e73a-1013-429b-b031-929597327ca6" width="49%" /> 
<img src="https://github.com/user-attachments/assets/91591bbb-5235-4af4-994a-cd77354fe237" width="49%" />

<br>


## Compost AI Smart Bin (Hardware)
### Setup

The AI smart bin contains two bins that disposed waste items can be sorted into: compost bin and garabge bin. Items that are classified as recycling by the waste classification model are re-routed to garbage. The Compost AI bin will be deployed in school cafeterias, so testing was primarily done on items that you could commonly find disposed off in a school cafeteria dustbin like food, food packaging wrappers, spoons, forks, etc. 

| **Hardware Component** | **Description** |
| ------------------ | ----------- |
| **Arduino Uno:** | Microcontroller that powers the servo motor and ultrasonic sensor |
| **HC-SR04 Ultrasonic Sensor:** | Constantly sends an echo out and back (up to a 30 centimeter threshold) to detect if a waste item has been dropped onto the cardboard tray |
| **SG90 Servo Motor** | Rotates 60 degrees to the left if the disposed item is classified as compost and rotates 60 degrees to the right if the disposed item is classified as garbage. The rotation of the servo motor pushed the cardboard tray containing the waste item to rottate as well, which results in the item falling in an angle to its appropriate bin. |
| **Ipad Camera** | The iPad rear-view camera allows us to a picture of the waste classification object and run inference through HuggingFace Spaces to determine what bin it should be sorted into. We used an iPad camera becuase it acts as a touch screen for this smart trash can, allowing the user to visualize the picture of the waste object in a gradCam AI view, read the confidence level and correct the model if its wrong" |

### Inference Backend
The inference backend is a FastAPI service that lives inside the `/inference` directory. It classifies a waste image with the trained EfficientNetB0 model, returns a Grad-CAM explainability
overlay that allows the uer to visualize what parts of the image affected the AI's classification of the item the most through a heatmap and uses a ***reinforcement learning technique*** called correction-memory, which allows the user to correct the models mistakes and those msitakes are then saved to memory, which the model learns from so it doesn't repeat the same mistake twice.

The inference backend is connected to a Next.js frontend that's deployed on Vercel. This app runs on the iPad and acts as a touchscreen to the smart bin, adding another layer of technology onto it. 

