// @flow
/**
 * Editable content area for rich text formatting that converts the formatted
 * text into a JSON representation of the text.
 */

/*
- Brittle because it doesn't recognize other types (links, blockquotes, etc)
- we COULD code it to recognize all this information, but it doesn't need to be that complex
- remembering, only need the text and any sort of styling it might have
- instead of walking down, maybe find the text and walk up?
- have to account for edge cases (e.g. use of !important, other weird overrides)
- another issue is that the nodes are not flat, so if the styler goes through once and doesn't find anything it likes, it stops
- additionally, using useEffect is probably not the hook we want to use, it triggers the parseNodes 3x
*/
import * as React from "react";
import ContentEditable from "react-contenteditable";
import JSONPretty from "react-json-pretty";
import ReactHtmlParser from "react-html-parser";
import styled from "styled-components";

import Colors from "./constants/colors";
import Spacing from "./constants/spacing";

const TEXTSTRING = "text";
const boldStrings = ['bold', 'bolder'];

// const parseNodesNew = (nodes, baseStyle = "normal") => {
//     let parsed = [];
//     for (const node of nodes) {
//         const { attribs, children, data, name, type, parent } = node;
//         // check if node has text
//         if (type === TEXTSTRING && !!data.trim()) {
//             // found a string? go up the chain and see if there are any styles
//             parsed = parsed.concat({
//                 style: findStyle(attribs, parent) || baseStyle,
//                 content: data
//             });
//         } else if (!!children && children.length) {
//             // walk down the DOM tree to find text nodes
//             parsed = parsed.concat(parseNodesNew(children));
//         };
//     }
//     return parsed;
// };

// const findStyle = (attributes, parentNode) => {
//     if (!attributes) {
//         const { name:parentName } = parentNode;
//         console.log('hello')
//         switch (parentName) {
//             case "b":
//                 return "bold";
//             case "i":
//                 return "italic";
//             default:
//                 return null;
//         }
//         return findStyle(parentNode.attribs, parentNode.parent);
//     } else if (attributes.style) {
//         return attributes.style;
//     }
// }

const parseNodes = (nodes, baseStyle = "normal") => {
    let parsed = [];
    for (const node of nodes) {
        const { attribs, children, data, name, type } = node;
        if (!name) {
            parsed = parsed.concat({
                style: baseStyle,
                content: data,
            });
        } else if (name === "b") {
            parsed = parsed.concat(
                parseNodes(
                    children,
                    baseStyle === "italic" ? "bold-italic" : "bold"
                )
            );
        } else if (name === "i") {
            parsed = parsed.concat(
                parseNodes(
                    children,
                    baseStyle === "bold" ? "bold-italic" : "italic"
                )
            );
        } else {
            const style = !!attribs.style ? attribs.style : "";
            // The detection of attributes here might be too specific. Is this
            // really the best way to do this?
            const isItalic = !!style.match(/italic/);
            const isBold = determineBold(style);
            if (isItalic && !isBold) {
                parsed = parsed.concat(parseNodes(children, "italic"));
            } else if (!isItalic && isBold) {
                parsed = parsed.concat(parseNodes(children, "bold"));
            } else if (isItalic && isBold) {
                parsed = parsed.concat(parseNodes(children, "bold-italic"));
            } 
            else {
                parsed = parsed.concat(parseNodes(children, "normal"));
            }
        }
    }
    return parsed;
};

const determineBold = (style) => {
    // this is messy, but checks for both bold in numerical weight + if defined by string
    if (style.match(/font-weight/)) {
        const fontWeight = style.match(/font-weight:\s*\d+/) || style.match(/font-weight:\s*\w+/);
        const weightValue = fontWeight[0].split(':')[1]
        if (parseInt(weightValue) && parseInt(weightValue) > 400 || boldStrings.includes(weightValue.trim().toLowerCase())) {
            return "bold";
        }
    }
}

const parseHtml = (html) =>
    ReactHtmlParser(html, {
        transform: (node, i) => {
            const { children, name, parent } = node;
            if (!parent && name === "div") {
                const parsed = parseNodes(children);
                return parsed.length > 0
                    ? {
                          content: parsed,
                      }
                    : null;
            } else {
                return null;
            }
        },
    }).filter((node) => !!node); // qq: what's this boolean transform for?

const App = () => {
    const [html, setHtml] = React.useState(
        "<div><p><b>Edit</b><i> text </i>here.</p><ul><li>This a list item</li><li><span style='font-weight: bold'>Hello there</span></li></ul><blockquote style='font-weight: 450; font-style: italic'>This is a quote</blockquote></div>"
    );
    const [parsed, setParsed] = React.useState(parseHtml(html));

    const handleChange = (e) => {
        setHtml(e.target.value);
    };

    React.useEffect(() => {
        const parsedHtml = parseHtml(html);
        setParsed(parsedHtml);
    }, [html]);

    return (
        <Wrapper>
            <ContentEditable
                html={html}
                onChange={handleChange}
                style={{
                    flex: 1,
                    maxWidth: "50vw",
                    fontSize: "17px",
                    fontFamily: "sans-serif",
                    fontWeight: 300,
                    lineHeight: "24px",
                    height: "100vh",
                    borderRight: `1px solid ${Colors.offBlack}`,
                    padding: `${Spacing.small}px`,
                }}
            />
            <Strut size={24} />
            <JSONPretty
                data={parsed}
                style={{
                    flex: 1,
                    overflowX: "scroll",
                }}
            />
        </Wrapper>
    );
};

const Wrapper = styled.div`
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    width: 100%;
`;

const Strut = styled.div`
    flex-basis: ${(props) => props.size}px;
`;

export default App;
