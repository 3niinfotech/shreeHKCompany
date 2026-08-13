import { createElement } from "react";
import { Pencil, CircleCheck } from "lucide-react";
import FormModal from "../modals/FormModal";
import "../../../assets/scss/masterEdit.scss";

function splitEditTitle(title) {
    if (typeof title !== "string") {
        return { main: title, sub: null };
    }
    const idx = title.indexOf(": ");
    if (idx === -1) {
        return { main: title, sub: null };
    }
    return {
        main: title.slice(0, idx).trim(),
        sub: title.slice(idx + 2).trim() || null,
    };
}

const MasterFormEditModal = ({ title, subtitle, ...props }) => {
    const { main, sub } = splitEditTitle(title);
    const resolvedSubtitle = subtitle ?? sub;

    return (
        <FormModal
            {...props}
            title={main}
            subtitle={resolvedSubtitle}
            variant="edit"
            saveBtnText="Update"
            cancelBtnText="Close"
            headerIcon={createElement(Pencil, { size: 16, strokeWidth: 2 })}
            saveIcon={createElement(CircleCheck, { size: 15, strokeWidth: 2.25 })}
        />
    );
};

export default MasterFormEditModal;
