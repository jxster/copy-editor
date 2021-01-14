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
*/
import * as React from "react";
import ContentEditable from "react-contenteditable";
import JSONPretty from "react-json-pretty";
import ReactHtmlParser from "react-html-parser";
import styled from "styled-components";

import Colors from "./constants/colors";
import Spacing from "./constants/spacing";

const TYPESTRING = "text";

const parseNodesNew = (nodes, baseStyle = "normal") => {
    let parsed = [];
    console.log(nodes);
    for (const node of nodes) {
        const { attribs, children, data, name, type } = node;
        // walk down the DOM tree until we find a text node
        if (type === TYPESTRING) {
            // found a string? go up the chain and see if there are any styles
            baseStyle = !!attribs ? attribs.style : baseStyle; // caused a bug! attribs undefined before DOM is fully loaded!
            parsed = parsed.concat({
                style: baseStyle,
                content: data
            });
        }
    }
    return parsed;
};
const parseNodes = (nodes, baseStyle = "normal") => {
    let parsed = [];
    for (const node of nodes) {
        const { attribs, children, data, name } = node;
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
        } else if (name === "span") {
            const { style } = attribs;
            // The detection of attributes here might be too specific. Is this
            // really the best way to do this?
            const isItalic = !!style.match(/italic/);
            const isBold = !!style.match(/weight:600/);
            if (isItalic && !isBold) {
                parsed = parsed.concat(parseNodes(children, "italic"));
            } else if (!isItalic && isBold) {
                parsed = parsed.concat(parseNodes(children, "bold"));
            } else if (isItalic && isBold) {
                parsed = parsed.concat(parseNodes(children, "bold-italic"));
            } else {
                parsed = parsed.concat(parseNodes(children, "normal"));
            }
        } else {
            console.log("couldn't parse")
            console.log(name);
        }
    }
    return parsed;
};

const parseHtml = (html) =>
    ReactHtmlParser(html, {
        transform: (node, i) => {
            const { children, name, parent } = node;
            if (!parent && name === "div") {
                const parsed = parseNodesNew(children);
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
    const [html, setHtml] = React.useState("<div>Edit text here.</div>");
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
